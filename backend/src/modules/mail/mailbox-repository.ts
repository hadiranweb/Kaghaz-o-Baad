import type pg from 'pg';
import { db } from '../../db/pool.js';

export type MailboxJob = {
  id: string;
  mailbox_id: string;
  operation: 'create' | 'reconcile' | 'delete';
  idempotency_key: string;
  attempts: number;
  provider_mail_server_id: string;
  provider_account_id: string | null;
  account_name: string;
  address: string;
  status: string;
  desired_state: string;
};

export async function claimMailboxJobs(options: { batchSize: number; leaseMs: number; workerId: string }): Promise<MailboxJob[]> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE mailbox_provisioning_jobs
       SET status='retryable', locked_at=NULL, locked_by=NULL, updated_at=now()
       WHERE status='running' AND locked_at < now() - ($1::int * interval '1 millisecond')`,
      [options.leaseMs],
    );
    const result = await client.query<MailboxJob>(
      `WITH candidates AS (
         SELECT j.id
         FROM mailbox_provisioning_jobs j
         WHERE j.status IN ('queued', 'retryable')
           AND j.available_at <= now()
         ORDER BY j.created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE mailbox_provisioning_jobs j
       SET status='running', locked_at=now(), locked_by=$2, attempts=j.attempts + 1, updated_at=now()
       FROM candidates c
       JOIN user_mailboxes m ON m.id=j.mailbox_id
       WHERE j.id=c.id
       RETURNING j.id, j.mailbox_id, j.operation, j.idempotency_key, j.attempts,
                 m.provider_mail_server_id, m.provider_account_id, m.account_name,
                 m.address, j.status, m.desired_state`,
      [options.batchSize, options.workerId],
    );
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function markMailboxJobSucceeded(jobId: string, mailboxId: string, providerAccountId: string | null, providerResponse: unknown) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (providerAccountId) {
      await client.query(
        `UPDATE user_mailboxes
         SET provider_account_id=$2, status='active', desired_state='active',
             last_error_code=NULL, last_error_message=NULL, provisioned_at=COALESCE(provisioned_at, now()),
             last_reconciled_at=now(), updated_at=now()
         WHERE id=$1`, [mailboxId, providerAccountId],
      );
    } else {
      await client.query(
        `UPDATE user_mailboxes SET status='active', last_error_code=NULL, last_error_message=NULL,
         last_reconciled_at=now(), updated_at=now() WHERE id=$1`, [mailboxId],
      );
    }
    await client.query(
      `UPDATE mailbox_provisioning_jobs
       SET status='succeeded', provider_response=$2::jsonb, provider_http_status=201,
           locked_at=NULL, locked_by=NULL, completed_at=now(), updated_at=now()
       WHERE id=$1`, [jobId, JSON.stringify(providerResponse ?? {})],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function markMailboxJobDeleted(jobId: string, mailboxId: string, providerResponse: unknown) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE user_mailboxes SET status='deleted', last_reconciled_at=now(), updated_at=now() WHERE id=$1`, [mailboxId]);
    await client.query(
      `UPDATE mailbox_provisioning_jobs
       SET status='succeeded', provider_response=$2::jsonb, provider_http_status=204,
           locked_at=NULL, locked_by=NULL, completed_at=now(), updated_at=now() WHERE id=$1`,
      [jobId, JSON.stringify(providerResponse ?? {})],
    );
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function markMailboxJobRetryable(job: MailboxJob, error: { code: string; message: string; status?: number }, nextAvailableAt: Date, response: unknown = {}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const terminal = job.attempts >= Number(process.env.MAILBOX_MAX_ATTEMPTS ?? 8);
    await client.query(
      `UPDATE mailbox_provisioning_jobs
       SET status=$2, available_at=$3, locked_at=NULL, locked_by=NULL,
           provider_http_status=$4, provider_response=$5::jsonb,
           last_error_code=$6, last_error_message=$7, updated_at=now(),
           completed_at=CASE WHEN $2='failed' THEN now() ELSE NULL END
       WHERE id=$1`,
      [job.id, terminal ? 'failed' : 'retryable', nextAvailableAt, error.status ?? null, JSON.stringify(response ?? {}), error.code.slice(0, 120), error.message.slice(0, 1_000)],
    );
    await client.query(
      `UPDATE user_mailboxes SET status=CASE WHEN $2='failed' THEN 'failed' ELSE 'provisioning' END,
       last_error_code=$3, last_error_message=$4, updated_at=now() WHERE id=$1`,
      [job.mailbox_id, terminal ? 'failed' : 'retryable', error.code.slice(0, 120), error.message.slice(0, 1_000)],
    );
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

export async function enqueueMailboxCreate(userId: string, platformDomainId: string, mailServerId: string, accountName: string, address: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const mailbox = await client.query<{ id: string }>(
      `INSERT INTO user_mailboxes (user_id, platform_domain_id, provider_mail_server_id, account_name, address, status, desired_state)
       VALUES ($1,$2,$3,$4,$5,'pending','active')
       ON CONFLICT (user_id) DO UPDATE SET updated_at=now()
       RETURNING id`, [userId, platformDomainId, mailServerId, accountName, address],
    );
    const mailboxRow = mailbox.rows[0];
    if (!mailboxRow) throw new Error('mailbox_insert_returned_no_row');
    const mailboxId = mailboxRow.id;
    await client.query(
      `INSERT INTO mailbox_provisioning_jobs (mailbox_id, operation, idempotency_key)
       VALUES ($1,'create',$2) ON CONFLICT (idempotency_key) DO NOTHING`, [mailboxId, `mailbox:${mailboxId}:create`],
    );
    await client.query('COMMIT');
    return mailboxId;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getMailboxByUserId(userId: string) {
  const result = await db.query(`SELECT * FROM user_mailboxes WHERE user_id=$1`, [userId]);
  return result.rows[0] ?? null;
}

export function isRetriableError(kind: string) {
  return ['rate_limited', 'transient', 'unknown'].includes(kind);
}

export type DbClient = pg.PoolClient;
