import { db } from '../../db/pool.js';

function intervalFor(period: string) {
  if (period === 'yearly') return '1 year';
  if (period === 'quarterly') return '3 months';
  return '1 month';
}

export async function getCurrentSubscription(userId: string) {
  const result = await db.query(
    `SELECT s.*, p.plan_key, p.name_fa, p.name_en
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status IN ('active','past_due','grace')
     ORDER BY s.created_at DESC LIMIT 1`, [userId],
  );
  return result.rows[0] ?? null;
}

export async function cancelSubscription(userId: string, immediate = false) {
  const result = await db.query(
    `UPDATE subscriptions SET
       status = CASE WHEN $2 THEN 'cancelled' ELSE status END,
       cancel_at_period_end = CASE WHEN $2 THEN FALSE ELSE TRUE END,
       cancelled_at = CASE WHEN $2 THEN now() ELSE cancelled_at END,
       updated_at = now()
     WHERE user_id = $1 AND status IN ('active','past_due','grace')
     RETURNING *`, [userId, immediate],
  );
  if (!result.rows[0]) throw new Error('subscription_not_found');
  if (immediate) await db.query(`UPDATE entitlements SET status='cancelled', updated_at=now() WHERE user_id=$1 AND status='active'`, [userId]);
  return result.rows[0];
}

export async function renewSubscription(userId: string) {
  const result = await db.query(
    `UPDATE subscriptions SET
       status='active', current_period_start=GREATEST(current_period_end, now()),
       current_period_end=GREATEST(current_period_end, now()) + CASE billing_period
         WHEN 'yearly' THEN interval '1 year'
         WHEN 'quarterly' THEN interval '3 months'
         ELSE interval '1 month' END,
       grace_period_end=NULL, cancel_at_period_end=FALSE, cancelled_at=NULL, updated_at=now()
     WHERE user_id=$1 AND status IN ('active','past_due','grace')
     RETURNING *`, [userId],
  );
  if (!result.rows[0]) throw new Error('subscription_not_found');
  return result.rows[0];
}

export async function enterGracePeriod(subscriptionId: string, days = 3) {
  const result = await db.query(
    `UPDATE subscriptions SET status='grace', grace_period_end=LEAST(current_period_end + ($2 || ' days')::interval, current_period_end + interval '30 days'), updated_at=now()
     WHERE id=$1 AND status IN ('active','past_due') RETURNING *`, [subscriptionId, days],
  );
  return result.rows[0] ?? null;
}

export async function expireDueSubscriptions() {
  const result = await db.query(
    `UPDATE subscriptions SET status='expired', updated_at=now()
     WHERE status IN ('active','past_due') AND cancel_at_period_end=TRUE AND current_period_end <= now()
     RETURNING id`,
  );
  return result.rowCount ?? 0;
}

export { intervalFor };
