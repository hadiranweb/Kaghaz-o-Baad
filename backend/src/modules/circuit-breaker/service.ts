import { db } from '../../db/pool.js';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreaker = {
  serviceName: string;
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureAt: Date | null;
  openedAt: Date | null;
  cooldownSeconds: number;
  updatedAt: Date;
};

export async function getCircuitBreaker(serviceName: string): Promise<CircuitBreaker | null> {
  const result = await db.query<{ service_name: string; state: string; failure_count: number; last_failure_at: Date | null; opened_at: Date | null; cooldown_seconds: number; updated_at: Date }>(
    'SELECT service_name, state, failure_count, last_failure_at, opened_at, cooldown_seconds, updated_at FROM circuit_breakers WHERE service_name = $1',
    [serviceName],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    serviceName: row.service_name,
    state: row.state as CircuitBreakerState,
    failureCount: row.failure_count,
    lastFailureAt: row.last_failure_at,
    openedAt: row.opened_at,
    cooldownSeconds: row.cooldown_seconds,
    updatedAt: row.updated_at,
  };
}

export async function isCircuitBreakerOpen(serviceName: string): Promise<boolean> {
  const breaker = await getCircuitBreaker(serviceName);
  if (!breaker) return false; // No breaker configured = always closed
  if (breaker.state === 'CLOSED') return false;
  if (breaker.state === 'OPEN') {
    // Check if cooldown has passed to allow HALF_OPEN transition
    if (breaker.openedAt && breaker.cooldownSeconds > 0) {
      const cooldownMs = breaker.cooldownSeconds * 1000;
      const now = new Date();
      const elapsed = now.getTime() - breaker.openedAt.getTime();
      if (elapsed >= cooldownMs) {
        // Auto-transition to HALF_OPEN after cooldown
        await db.query(
          `UPDATE circuit_breakers SET state = 'HALF_OPEN', updated_at = now() WHERE service_name = $1`,
          [serviceName],
        );
        return false; // HALF_OPEN allows one test call
      }
    }
    return true; // Still OPEN
  }
  return false; // HALF_OPEN allows call
}

export async function recordFailure(serviceName: string): Promise<void> {
  await db.query(
    `UPDATE circuit_breakers
     SET failure_count = failure_count + 1, last_failure_at = now(), state = CASE
       WHEN failure_count + 1 >= 5 THEN 'OPEN'
       ELSE state
     END,
     opened_at = CASE WHEN failure_count + 1 >= 5 THEN now() ELSE opened_at END,
     updated_at = now()
     WHERE service_name = $1`,
    [serviceName],
  );
}

export async function recordSuccess(serviceName: string): Promise<void> {
  await db.query(
    `UPDATE circuit_breakers
     SET state = 'CLOSED', failure_count = 0, last_failure_at = NULL, opened_at = NULL, updated_at = now()
     WHERE service_name = $1`,
    [serviceName],
  );
}

export async function initializeDefaultBreakers(): Promise<void> {
  await db.query(`INSERT INTO circuit_breakers (service_name) VALUES ('ai-provider'), ('smsir-api'), ('livekit') ON CONFLICT DO NOTHING`);
}
