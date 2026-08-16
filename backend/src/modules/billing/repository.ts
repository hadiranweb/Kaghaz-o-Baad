import { randomUUID } from 'node:crypto';
import { db } from '../../db/pool.js';

export type CreateInvoiceInput = {
  userId: string;
  planKey: string;
  currency: string;
  amountMinor: number;
  description: string;
  dueAt?: Date;
};

export async function createInvoice(input: CreateInvoiceInput) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('invalid_invoice_amount');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const plan = await client.query<{ id: string; planKey: string; nameFa: string }>(
      `SELECT id, plan_key AS "planKey", name_fa AS "nameFa" FROM plans WHERE plan_key = $1 AND is_active = TRUE`,
      [input.planKey],
    );
    const selectedPlan = plan.rows[0];
    if (!selectedPlan) throw new Error('plan_not_found');
    const number = `KB-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const invoice = await client.query<{ id: string; invoiceNumber: string }>(
      `INSERT INTO invoices (user_id, invoice_number, status, currency, subtotal_minor, total_minor, plan_key, plan_snapshot, due_at)
       VALUES ($1, $2, 'issued', $3, $4, $4, $5, $6, $7)
       RETURNING id, invoice_number AS "invoiceNumber"`,
      [input.userId, number, input.currency, input.amountMinor, selectedPlan.planKey, { planKey: selectedPlan.planKey, nameFa: selectedPlan.nameFa }, input.dueAt ?? null],
    );
    await client.query(
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_amount_minor, total_amount_minor)
       VALUES ($1, $2, 1, $3, $3)`,
      [invoice.rows[0]!.id, input.description, input.amountMinor],
    );
    await client.query('COMMIT');
    return invoice.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function createPaymentAttempt(input: {
  invoiceId: string;
  userId: string;
  provider: string;
  idempotencyKey: string;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) throw new Error('invalid_idempotency_key');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT * FROM payment_attempts WHERE idempotency_key = $1 FOR UPDATE`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].user_id !== input.userId) throw new Error('idempotency_key_conflict');
      await client.query('COMMIT');
      return existing.rows[0];
    }
    const invoice = await client.query<{ totalMinor: string; currency: string; status: string }>(
      `SELECT total_minor AS "totalMinor", currency, status FROM invoices WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [input.invoiceId, input.userId],
    );
    const row = invoice.rows[0];
    if (!row) throw new Error('invoice_not_found');
    if (!['issued', 'draft'].includes(row.status)) throw new Error('invoice_not_payable');
    const attempt = await client.query(
      `INSERT INTO payment_attempts (invoice_id, user_id, provider, status, amount_minor, currency, idempotency_key)
       VALUES ($1, $2, $3, 'created', $4, $5, $6)
       RETURNING *`,
      [input.invoiceId, input.userId, input.provider, Number(row.totalMinor), row.currency, input.idempotencyKey],
    );
    await client.query('COMMIT');
    return attempt.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}


export async function attachProviderRequest(input: { attemptId: string; userId: string; authority: string; redirectUrl: string; rawResponse: unknown }) {
  const result = await db.query(
    `UPDATE payment_attempts SET status = 'pending', authority = $1, redirect_url = $2, provider_request_id = $1, raw_response = $3, updated_at = now()
     WHERE id = $4 AND user_id = $5 AND status = 'created' RETURNING *`,
    [input.authority, input.redirectUrl, input.rawResponse, input.attemptId, input.userId],
  );
  if (!result.rows[0]) throw new Error('payment_attempt_not_pending');
  return result.rows[0];
}

export async function findAttemptByAuthority(authority: string) {
  const result = await db.query(
    `SELECT pa.*, i.plan_key, i.total_minor AS invoice_total_minor, i.status AS invoice_status
     FROM payment_attempts pa JOIN invoices i ON i.id = pa.invoice_id
     WHERE pa.authority = $1 LIMIT 1`, [authority],
  );
  return result.rows[0];
}

export async function markPaymentSucceeded(input: { attemptId: string; refId?: string; rawResponse: unknown }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const attemptResult = await client.query(
      `SELECT pa.*, i.plan_key FROM payment_attempts pa JOIN invoices i ON i.id = pa.invoice_id WHERE pa.id = $1 FOR UPDATE`, [input.attemptId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) throw new Error('payment_attempt_not_found');
    if (attempt.status === 'succeeded') { await client.query('COMMIT'); return attempt; }
    if (!['pending', 'created'].includes(attempt.status)) throw new Error('payment_attempt_not_verifiable');
    const updated = await client.query(
      `UPDATE payment_attempts SET status='succeeded', provider_payment_id=COALESCE($1, provider_payment_id), raw_response=$2, completed_at=now(), updated_at=now() WHERE id=$3 RETURNING *`,
      [input.refId ?? null, input.rawResponse, input.attemptId],
    );
    await client.query(`UPDATE invoices SET status='paid', paid_at=now(), updated_at=now() WHERE id=$1`, [attempt.invoice_id]);
    const subscriptionResult = await client.query<{ id: string }>(
      `UPDATE subscriptions s SET plan_id=p.id, status='active', billing_period='monthly', currency=pa.currency,
          amount_minor=pa.amount_minor, current_period_start=now(), current_period_end=now() + interval '1 month',
          grace_period_end=NULL, cancel_at_period_end=FALSE, cancelled_at=NULL, provider=pa.provider,
          latest_invoice_id=pa.invoice_id, updated_at=now()
       FROM plans p JOIN payment_attempts pa ON pa.id=$2
       WHERE s.user_id=$1 AND s.status IN ('active','past_due','grace') AND p.plan_key=$3
       RETURNING s.id`, [attempt.user_id, attempt.id, attempt.plan_key],
    );
    let subscriptionId = subscriptionResult.rows[0]?.id;
    if (!subscriptionId) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO subscriptions (user_id, plan_id, status, billing_period, currency, amount_minor, current_period_start, current_period_end, provider, latest_invoice_id)
         SELECT $1, p.id, 'active', 'monthly', pa.currency, pa.amount_minor, now(), now() + interval '1 month', pa.provider, pa.invoice_id
         FROM plans p JOIN payment_attempts pa ON pa.id=$2 WHERE p.plan_key=$3 RETURNING id`,
        [attempt.user_id, attempt.id, attempt.plan_key],
      );
      subscriptionId = inserted.rows[0]?.id;
    }
    if (!subscriptionId) throw new Error('subscription_plan_not_found');
    await client.query(`UPDATE entitlements SET status='expired', updated_at=now() WHERE user_id=$1 AND status='active'`, [attempt.user_id]);
    await client.query(
      `INSERT INTO entitlements (user_id, plan_id, subscription_id, status, starts_at, ends_at, source)
       SELECT $1, p.id, $2, 'active', now(), now() + interval '1 month', 'payment'
       FROM plans p WHERE p.plan_key=$3`, [attempt.user_id, subscriptionId, attempt.plan_key],
    );
    await client.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata) VALUES ($1, 'payment.succeeded', 'payment_attempt', $2, $3)`,
      [attempt.user_id, attempt.id, { refId: input.refId ?? null, invoiceId: attempt.invoice_id }],
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function markPaymentFailed(input: { attemptId: string; code: string; message: string; rawResponse: unknown }) {
  const result = await db.query(
    `UPDATE payment_attempts SET status='failed', failure_code=$1, failure_message=$2, raw_response=$3, completed_at=now(), updated_at=now()
     WHERE id=$4 AND status IN ('created','pending') RETURNING *`, [input.code, input.message, input.rawResponse, input.attemptId],
  );
  return result.rows[0];
}


export async function getPaymentAttemptForUser(attemptId: string, userId: string) {
  const result = await db.query(`SELECT * FROM payment_attempts WHERE id = $1 AND user_id = $2`, [attemptId, userId]);
  return result.rows[0];
}
