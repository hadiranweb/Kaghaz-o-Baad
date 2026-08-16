import { db } from '../db/pool.js';

export type LifecycleJobResult = {
  scanned: number;
  movedToGrace: number;
  movedToExpired: number;
  entitlementsExpired: number;
};

export async function runSubscriptionLifecycleJob(options: { graceDays?: number; batchSize?: number } = {}): Promise<LifecycleJobResult> {
  const graceDays = Math.max(1, Math.min(options.graceDays ?? 3, 30));
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 500, 5000));
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const due = await client.query<{ id: string }>(
      `SELECT id FROM subscriptions
       WHERE status IN ('active','past_due') AND current_period_end <= now()
       ORDER BY current_period_end ASC
       FOR UPDATE SKIP LOCKED LIMIT $1`, [batchSize],
    );
    const grace = await client.query<{ id: string; user_id: string }>(
      `UPDATE subscriptions SET status='grace', grace_period_end=current_period_end + ($1 || ' days')::interval, updated_at=now()
       WHERE id = ANY($2::uuid[]) AND status IN ('active','past_due')
       RETURNING id, user_id`, [graceDays, due.rows.map((row) => row.id)],
    );

    const expired = await client.query<{ id: string; user_id: string }>(
      `WITH candidates AS (
         SELECT id FROM subscriptions
         WHERE status='grace' AND grace_period_end IS NOT NULL AND grace_period_end <= now()
         ORDER BY grace_period_end ASC
         FOR UPDATE SKIP LOCKED LIMIT $1
       )
       UPDATE subscriptions s SET status='expired', updated_at=now()
       FROM candidates c WHERE s.id=c.id
       RETURNING s.id, s.user_id`, [batchSize],
    );
    const expiredUsers = [...new Set(expired.rows.map((row) => row.user_id))];
    let entitlementsExpired = 0;
    if (expiredUsers.length > 0) {
      const entitlementResult = await client.query(
        `UPDATE entitlements SET status='expired', updated_at=now()
         WHERE user_id = ANY($1::uuid[]) AND status='active'
           AND (subscription_id IS NULL OR subscription_id = ANY($2::uuid[]))`,
        [expiredUsers, expired.rows.map((row) => row.id)],
      );
      entitlementsExpired = entitlementResult.rowCount ?? 0;
    }
    await client.query('COMMIT');
    const dueCount = due.rowCount ?? due.rows.length;
    const graceCount = grace.rowCount ?? grace.rows.length;
    const expiredCount = expired.rowCount ?? expired.rows.length;
    return { scanned: dueCount + expiredCount, movedToGrace: graceCount, movedToExpired: expiredCount, entitlementsExpired };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runSubscriptionLifecycleJob({
    graceDays: Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 3),
    batchSize: Number(process.env.SUBSCRIPTION_JOB_BATCH_SIZE ?? 500),
  });
  console.log(JSON.stringify({ ok: true, ...result }));
}
