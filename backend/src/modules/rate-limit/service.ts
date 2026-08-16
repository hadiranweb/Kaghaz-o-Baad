import { createHash } from 'node:crypto';
import { db } from '../../db/pool.js';

export class RateLimitExceededError extends Error {
  readonly statusCode = 429;
  constructor(public readonly retryAfterSeconds: number, public readonly limit: number, public readonly remaining: number) {
    super('rate_limit_exceeded');
  }
}

export type RateLimitConfig = {
  name: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

function safeKey(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function consumeRateLimit(input: {
  key: string;
  config: RateLimitConfig;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = input.config.windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + windowMs);
  const bucketKey = `${input.config.name}:${safeKey(input.key)}`;
  const result = await db.query<{ requestCount: number }>(
    `INSERT INTO rate_limit_buckets
       (bucket_key, window_start, window_seconds, request_count, expires_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (bucket_key, window_start)
     DO UPDATE SET request_count = rate_limit_buckets.request_count + 1,
                   updated_at = now(),
                   expires_at = EXCLUDED.expires_at
     RETURNING request_count AS "requestCount"`,
    [bucketKey, windowStart, input.config.windowSeconds, resetAt],
  );
  const count = Number(result.rows[0]?.requestCount ?? input.config.limit + 1);
  const remaining = Math.max(0, input.config.limit - count);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));
  if (count > input.config.limit) throw new RateLimitExceededError(retryAfterSeconds, input.config.limit, remaining);
  return { limit: input.config.limit, remaining, resetAt, retryAfterSeconds };
}

export async function enforceRateLimit(input: { key: string; config: RateLimitConfig }) {
  return consumeRateLimit(input);
}
