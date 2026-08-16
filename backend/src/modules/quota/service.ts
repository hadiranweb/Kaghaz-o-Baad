import { db } from '../../db/pool.js';

export class QuotaExceededError extends Error {
  readonly statusCode = 429;
  constructor(public readonly featureKey: string, public readonly remaining: number) {
    super('quota_exceeded');
  }
}

export class QuotaNotConfiguredError extends Error {
  readonly statusCode = 403;
  constructor(public readonly featureKey: string) {
    super('quota_not_configured');
  }
}

type Reservation = {
  id: string;
  featureKey: string;
  reservedUnits: number;
  periodStart: Date;
};

function periodStart(period: string, now = new Date()) {
  const value = new Date(now);
  if (period === 'daily') value.setUTCHours(0, 0, 0, 0);
  else if (period === 'monthly') value.setUTCDate(1), value.setUTCHours(0, 0, 0, 0);
  else value.setTime(0);
  return value;
}

function periodEnd(period: string, start: Date) {
  if (period === 'daily') return new Date(start.getTime() + 86_400_000);
  if (period === 'monthly') return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return null;
}

export async function reserveQuota(input: {
  userId: string;
  requestId: string;
  featureKey: string;
  units?: number;
}): Promise<Reservation> {
  const units = input.units ?? 1;
  if (!Number.isFinite(units) || units <= 0) throw new Error('invalid_quota_units');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const entitlement = await client.query<{
      parameterId: string;
      period: string;
      limitValue: string;
      exhaustionPolicy: string;
    }>(
      `SELECT pp.id AS "parameterId", pp.period, ppv.limit_value AS "limitValue", pp.exhaustion_policy AS "exhaustionPolicy"
       FROM entitlements e
       JOIN plan_parameter_values ppv ON ppv.plan_id = e.plan_id AND ppv.enabled = TRUE
       JOIN plan_parameters pp ON pp.id = ppv.parameter_id AND pp.is_active = TRUE
       WHERE e.user_id = $1 AND e.status = 'active'
         AND (e.starts_at <= now()) AND (e.ends_at IS NULL OR e.ends_at > now())
         AND pp.parameter_key = $2
       ORDER BY e.starts_at DESC LIMIT 1
       FOR UPDATE OF e, ppv`,
      [input.userId, input.featureKey],
    );
    const policy = entitlement.rows[0];
    if (!policy) throw new QuotaNotConfiguredError(input.featureKey);
    const start = periodStart(policy.period);
    const end = periodEnd(policy.period, start);
    const counter = await client.query<{ usedUnits: string; reservedUnits: string }>(
      `INSERT INTO quota_counters (user_id, parameter_id, period_start, period_end)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, parameter_id, period_start)
       DO UPDATE SET updated_at = now()
       RETURNING used_units AS "usedUnits", reserved_units AS "reservedUnits"`,
      [input.userId, policy.parameterId, start, end],
    );
    const current = counter.rows[0];
    const used = Number(current?.usedUnits ?? 0);
    const reserved = Number(current?.reservedUnits ?? 0);
    const limit = Number(policy.limitValue);
    const remaining = limit - used - reserved;
    if (policy.exhaustionPolicy !== 'allow_overage' && remaining < units) {
      throw new QuotaExceededError(input.featureKey, Math.max(0, remaining));
    }
    const existing = await client.query<{ id: string; reservedUnits: string; periodStart: Date }>(
      `SELECT id, reserved_units AS "reservedUnits", period_start AS "periodStart"
       FROM quota_reservations
       WHERE user_id = $1 AND request_id = $2 AND feature_key = $3
       FOR UPDATE`,
      [input.userId, input.requestId, input.featureKey],
    );
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return { id: existing.rows[0].id, featureKey: input.featureKey, reservedUnits: Number(existing.rows[0].reservedUnits), periodStart: existing.rows[0].periodStart };
    }
    const reservation = await client.query<{ id: string }>(
      `INSERT INTO quota_reservations
       (user_id, parameter_id, request_id, feature_key, period_start, reserved_units)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [input.userId, policy.parameterId, input.requestId, input.featureKey, start, units],
    );
    await client.query(
      `UPDATE quota_counters SET reserved_units = reserved_units + $1, updated_at = now()
       WHERE user_id = $2 AND parameter_id = $3 AND period_start = $4`,
      [units, input.userId, policy.parameterId, start],
    );
    await client.query('COMMIT');
    return { id: reservation.rows[0]!.id, featureKey: input.featureKey, reservedUnits: units, periodStart: start };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function commitQuota(reservation: Reservation, actualUnits?: number) {
  const units = actualUnits ?? reservation.reservedUnits;
  if (!Number.isFinite(units) || units < 0 || units > reservation.reservedUnits) throw new Error('invalid_committed_quota_units');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query<{ userId: string; parameterId: string; periodStart: Date; reservedUnits: string; state: string }>(
      `SELECT user_id AS "userId", parameter_id AS "parameterId", period_start AS "periodStart", reserved_units AS "reservedUnits", state
       FROM quota_reservations WHERE id = $1 FOR UPDATE`, [reservation.id]);
    const row = locked.rows[0];
    if (!row) throw new Error('quota_reservation_not_found');
    if (row.state !== 'reserved') { await client.query('COMMIT'); return; }
    await client.query(
      `UPDATE quota_counters SET reserved_units = reserved_units - $1, used_units = used_units + $2, updated_at = now()
       WHERE user_id = $3 AND parameter_id = $4 AND period_start = $5`,
      [Number(row.reservedUnits), units, row.userId, row.parameterId, row.periodStart],
    );
    await client.query(`UPDATE quota_reservations SET state = 'committed', completed_at = now() WHERE id = $1`, [reservation.id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function getQuotaStatus(userId: string, featureKey: string) {
  const entitlement = await db.query<{
    planKey: string;
    planNameFa: string;
    parameterId: string;
    period: string;
    limitValue: string;
    exhaustionPolicy: string;
  }>(
    `SELECT p.plan_key AS "planKey", p.name_fa AS "planNameFa", pp.id AS "parameterId", pp.period,
            ppv.limit_value AS "limitValue", pp.exhaustion_policy AS "exhaustionPolicy"
     FROM entitlements e
     JOIN plans p ON p.id = e.plan_id
     JOIN plan_parameter_values ppv ON ppv.plan_id = e.plan_id AND ppv.enabled = TRUE
     JOIN plan_parameters pp ON pp.id = ppv.parameter_id AND pp.is_active = TRUE
     WHERE e.user_id = $1 AND e.status = 'active'
       AND e.starts_at <= now() AND (e.ends_at IS NULL OR e.ends_at > now())
       AND pp.parameter_key = $2
     ORDER BY e.starts_at DESC LIMIT 1`,
    [userId, featureKey],
  );
  const policy = entitlement.rows[0];
  if (!policy) return { configured: false as const, featureKey };
  const start = periodStart(policy.period);
  const end = periodEnd(policy.period, start);
  const counter = await db.query<{ usedUnits: string; reservedUnits: string }>(
    `SELECT used_units AS "usedUnits", reserved_units AS "reservedUnits"
     FROM quota_counters WHERE user_id = $1 AND parameter_id = $2 AND period_start = $3`,
    [userId, policy.parameterId, start],
  );
  const used = Number(counter.rows[0]?.usedUnits ?? 0);
  const reserved = Number(counter.rows[0]?.reservedUnits ?? 0);
  const limit = Number(policy.limitValue);
  return {
    configured: true as const,
    featureKey,
    planKey: policy.planKey,
    planNameFa: policy.planNameFa,
    period: policy.period,
    periodStart: start.toISOString(),
    periodEnd: end?.toISOString() ?? null,
    limit,
    used,
    reserved,
    remaining: Math.max(0, limit - used - reserved),
    exhaustionPolicy: policy.exhaustionPolicy,
  };
}

export async function releaseQuota(reservation: Reservation) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query<{ userId: string; parameterId: string; periodStart: Date; reservedUnits: string; state: string }>(
      `SELECT user_id AS "userId", parameter_id AS "parameterId", period_start AS "periodStart", reserved_units AS "reservedUnits", state
       FROM quota_reservations WHERE id = $1 FOR UPDATE`, [reservation.id]);
    const row = locked.rows[0];
    if (!row) throw new Error('quota_reservation_not_found');
    if (row.state !== 'reserved') { await client.query('COMMIT'); return; }
    await client.query(
      `UPDATE quota_counters SET reserved_units = reserved_units - $1, updated_at = now()
       WHERE user_id = $2 AND parameter_id = $3 AND period_start = $4`,
      [Number(row.reservedUnits), row.userId, row.parameterId, row.periodStart],
    );
    await client.query(`UPDATE quota_reservations SET state = 'released', completed_at = now() WHERE id = $1`, [reservation.id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
