import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { db } from '../../db/pool.js';
import type { ArticleContentSnapshot } from '../../modules/article-ai/snapshot-service.js';

export type CasioInvocationState = 'queued' | 'dispatched' | 'accepted' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stale';
export type OutboxStatus = 'pending' | 'leased' | 'delivered' | 'dead_letter' | 'cancelled';

export type CasioFlowInvocation = {
  id: string;
  article_id: string;
  snapshot_id: string;
  requested_by_user_id: string | null;
  actor_id: string;
  actor_roles: string[];
  flow_key: string;
  contract_version: string;
  request_id: string;
  idempotency_key: string;
  casio_run_id: string | null;
  state: CasioInvocationState;
  last_error_code: string | null;
  created_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
};

export type OutboxEvent = {
  id: string;
  invocation_id: string;
  snapshot_id: string;
  request_id: string;
  idempotency_key: string;
  status: OutboxStatus;
  attempts: number;
  available_at: string;
  lease_token: string | null;
  leased_until: string | null;
};

export type LeasedCasioOutboxEvent = {
  outboxId: string;
  invocationId: string;
  snapshotId: string;
  requestId: string;
  idempotencyKey: string;
  leaseToken: string;
  attempts: number;
  flowKey: string;
  contractVersion: string;
  requestedByUserId: string | null;
  actorId: string;
  actorRoles: string[];
  articleId: string;
  contentRevision: number;
  contentSha256: string;
  canonicalPayload: ArticleContentSnapshot['canonical_payload'];
};

export async function createCasioInvocationAndOutbox(input: {
  client: PoolClient;
  articleId: string;
  snapshot: ArticleContentSnapshot;
  requestedByUserId: string;
  actorId: string;
  actorRoles: string[];
  requestId: string;
  idempotencyKey: string;
  flowKey: string;
  contractVersion: string;
}): Promise<{ invocation: CasioFlowInvocation; outbox: OutboxEvent; idempotent: boolean }> {
  const invocationInsert = await input.client.query<CasioFlowInvocation>(
    `INSERT INTO casio_flow_invocations
       (article_id, snapshot_id, requested_by_user_id, actor_id, actor_roles, flow_key, contract_version, request_id, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (article_id, snapshot_id, flow_key, contract_version, idempotency_key) DO NOTHING
     RETURNING id, article_id, snapshot_id, requested_by_user_id, actor_id, actor_roles, flow_key, contract_version,
               request_id, idempotency_key, casio_run_id, state, last_error_code, created_at, dispatched_at, completed_at`,
    [
      input.articleId,
      input.snapshot.id,
      input.requestedByUserId,
      input.actorId,
      input.actorRoles,
      input.flowKey,
      input.contractVersion,
      input.requestId,
      input.idempotencyKey,
    ],
  );

  let invocation = invocationInsert.rows[0];
  const idempotent = !invocation;
  if (!invocation) {
    const existing = await input.client.query<CasioFlowInvocation>(
      `SELECT id, article_id, snapshot_id, requested_by_user_id, actor_id, actor_roles, flow_key, contract_version,
              request_id, idempotency_key, casio_run_id, state, last_error_code, created_at, dispatched_at, completed_at
         FROM casio_flow_invocations
        WHERE article_id = $1 AND snapshot_id = $2 AND flow_key = $3
          AND contract_version = $4 AND idempotency_key = $5
        FOR UPDATE`,
      [input.articleId, input.snapshot.id, input.flowKey, input.contractVersion, input.idempotencyKey],
    );
    invocation = existing.rows[0];
    if (!invocation) throw new Error('casio_invocation_not_found_after_conflict');
  }

  const outboxInsert = await input.client.query<OutboxEvent>(
    `INSERT INTO integration_outbox
       (destination, event_type, aggregate_type, aggregate_id, invocation_id, snapshot_id,
        request_id, idempotency_key, payload_schema_version)
     VALUES ('casioplus', 'casio.flow.invoke.v1', 'article', $1, $2, $3, $4, $5, $6)
     ON CONFLICT (destination, idempotency_key) DO NOTHING
     RETURNING id, invocation_id, snapshot_id, request_id, idempotency_key, status, attempts,
               available_at, lease_token, leased_until`,
    [input.articleId, invocation.id, input.snapshot.id, invocation.request_id, invocation.idempotency_key, input.contractVersion],
  );

  let outbox = outboxInsert.rows[0];
  if (!outbox) {
    const existing = await input.client.query<OutboxEvent>(
      `SELECT id, invocation_id, snapshot_id, request_id, idempotency_key, status, attempts,
              available_at, lease_token, leased_until
         FROM integration_outbox
        WHERE destination = 'casioplus' AND idempotency_key = $1
        FOR UPDATE`,
      [invocation.idempotency_key],
    );
    outbox = existing.rows[0];
    if (!outbox) throw new Error('casio_outbox_not_found_after_conflict');
  }

  return { invocation, outbox, idempotent };
}

export async function leaseCasioOutboxEvents(input: {
  limit: number;
  leaseMs: number;
}): Promise<LeasedCasioOutboxEvent[]> {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new Error('invalid_outbox_lease_limit');
  if (!Number.isInteger(input.leaseMs) || input.leaseMs < 5_000) throw new Error('invalid_outbox_lease_duration');

  const leaseToken = randomUUID();
  const result = await db.query<{
    outbox_id: string;
    invocation_id: string;
    snapshot_id: string;
    request_id: string;
    idempotency_key: string;
    lease_token: string;
    attempts: number;
    flow_key: string;
    contract_version: string;
    requested_by_user_id: string | null;
    actor_id: string;
    actor_roles: string[];
    article_id: string;
    content_revision: number;
    content_sha256: string;
    canonical_payload: ArticleContentSnapshot['canonical_payload'];
  }>(
    `WITH candidates AS (
       SELECT id
         FROM integration_outbox
        WHERE destination = 'casioplus'
          AND (
            (status = 'pending' AND available_at <= now())
            OR (status = 'leased' AND leased_until <= now())
          )
        ORDER BY available_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     ), leased AS (
       UPDATE integration_outbox o
          SET status = 'leased',
              lease_token = $2,
              leased_until = now() + ($3::text || ' milliseconds')::interval,
              attempts = attempts + 1,
              updated_at = now()
         FROM candidates c
        WHERE o.id = c.id
        RETURNING o.id, o.invocation_id, o.snapshot_id, o.request_id, o.idempotency_key,
                  o.lease_token, o.attempts
     )
     SELECT l.id AS outbox_id, l.invocation_id, l.snapshot_id, l.request_id, l.idempotency_key,
            l.lease_token, l.attempts,
            i.flow_key, i.contract_version, i.requested_by_user_id, i.actor_id, i.actor_roles, i.article_id,
            s.content_revision, s.content_sha256, s.canonical_payload
       FROM leased l
       JOIN casio_flow_invocations i ON i.id = l.invocation_id
       JOIN article_content_snapshots s ON s.id = l.snapshot_id
      ORDER BY l.id`,
    [input.limit, leaseToken, input.leaseMs],
  );

  return result.rows.map((row) => ({
    outboxId: row.outbox_id,
    invocationId: row.invocation_id,
    snapshotId: row.snapshot_id,
    requestId: row.request_id,
    idempotencyKey: row.idempotency_key,
    leaseToken: row.lease_token,
    attempts: row.attempts,
    flowKey: row.flow_key,
    contractVersion: row.contract_version,
    requestedByUserId: row.requested_by_user_id,
    actorId: row.actor_id,
    actorRoles: Array.isArray(row.actor_roles) ? row.actor_roles : [],
    articleId: row.article_id,
    contentRevision: Number(row.content_revision),
    contentSha256: row.content_sha256,
    canonicalPayload: row.canonical_payload,
  }));
}

export async function markCasioOutboxDelivered(input: {
  outboxId: string;
  leaseToken: string;
  runId: string;
}): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const delivery = await client.query(
      `UPDATE integration_outbox
          SET status = 'delivered', lease_token = NULL, leased_until = NULL, delivered_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'leased' AND lease_token = $2
        RETURNING invocation_id`,
      [input.outboxId, input.leaseToken],
    );
    if (delivery.rowCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `UPDATE casio_flow_invocations
          SET state = 'accepted', casio_run_id = $1, dispatched_at = COALESCE(dispatched_at, now()), last_error_code = NULL
        WHERE id = $2 AND state IN ('queued', 'dispatched', 'accepted', 'running')`,
      [input.runId, delivery.rows[0].invocation_id],
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rescheduleCasioOutboxEvent(input: {
  outboxId: string;
  leaseToken: string;
  errorCode: string;
  retryAt: Date | null;
}): Promise<boolean> {
  const terminal = input.retryAt === null;
  const result = await db.query(
    `UPDATE integration_outbox
        SET status = $3,
            lease_token = NULL,
            leased_until = NULL,
            available_at = COALESCE($4, available_at),
            last_error_code = $5,
            last_error_at = now(),
            updated_at = now()
      WHERE id = $1 AND status = 'leased' AND lease_token = $2
      RETURNING invocation_id`,
    [input.outboxId, input.leaseToken, terminal ? 'dead_letter' : 'pending', input.retryAt, input.errorCode],
  );
  if (result.rowCount !== 1) return false;
  if (terminal) {
    await db.query(
      `UPDATE casio_flow_invocations
          SET state = 'failed', last_error_code = $1, completed_at = now()
        WHERE id = $2 AND state NOT IN ('completed', 'cancelled', 'stale')`,
      [input.errorCode, result.rows[0].invocation_id],
    );
  }
  return true;
}

export async function cancelPendingCasioOutboxForArticle(articleId: string): Promise<number> {
  const result = await db.query(
    `UPDATE integration_outbox
        SET status = 'cancelled', lease_token = NULL, leased_until = NULL, updated_at = now()
      WHERE aggregate_id = $1 AND destination = 'casioplus' AND status = 'pending'
      RETURNING invocation_id`,
    [articleId],
  );
  if (result.rowCount) {
    await db.query(
      `UPDATE casio_flow_invocations
          SET state = 'cancelled', completed_at = now(), last_error_code = 'article_deleted_before_dispatch'
        WHERE id = ANY($1::uuid[]) AND state = 'queued'`,
      [result.rows.map((row) => row.invocation_id)],
    );
  }
  return result.rowCount ?? 0;
}
