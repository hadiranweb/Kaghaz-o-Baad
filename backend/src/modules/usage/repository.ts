import { db } from '../../db/pool.js';
import type { UsageEventInsert, UsageMetrics } from './types.js';

function nonNegativeInteger(value: number | undefined) {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) throw new Error('invalid_usage_token_count');
  return value;
}

function nonNegativeNumber(value: number | undefined) {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) throw new Error('invalid_usage_units');
  return value;
}

export async function insertUsageEvent(input: UsageEventInsert) {
  const metrics = {
    inputTokens: nonNegativeInteger(input.inputTokens),
    outputTokens: nonNegativeInteger(input.outputTokens),
    cachedTokens: nonNegativeInteger(input.cachedTokens),
    units: nonNegativeNumber(input.units),
    costMinor: input.costMinor === undefined ? null : Math.max(0, Math.round(input.costMinor)),
  };
  return db.query(
    `INSERT INTO usage_events
      (user_id, article_id, request_id, feature_key, tool_name, provider, model, pricing_version,
       status, input_tokens, output_tokens, cached_tokens, units, currency, cost_minor,
       error_code, metadata, started_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id, status, created_at`,
    [
      input.userId,
      input.articleId ?? null,
      input.requestId,
      input.featureKey,
      input.toolName ?? null,
      input.provider,
      input.model,
      input.pricingVersion ?? null,
      input.status,
      metrics.inputTokens,
      metrics.outputTokens,
      metrics.cachedTokens,
      metrics.units,
      input.currency ?? null,
      metrics.costMinor,
      input.errorCode ?? null,
      input.metadata ?? {},
      input.startedAt,
      input.completedAt ?? null,
    ],
  );
}

export async function updateUsageEvent(id: string, input: Pick<UsageEventInsert, 'status' | 'errorCode' | 'completedAt'> & UsageMetrics) {
  const metrics = {
    inputTokens: nonNegativeInteger(input.inputTokens),
    outputTokens: nonNegativeInteger(input.outputTokens),
    cachedTokens: nonNegativeInteger(input.cachedTokens),
    units: nonNegativeNumber(input.units),
    costMinor: input.costMinor === undefined ? null : Math.max(0, Math.round(input.costMinor)),
  };
  return db.query(
    `UPDATE usage_events
     SET status = $1, input_tokens = $2, output_tokens = $3, cached_tokens = $4,
         units = $5, currency = $6, cost_minor = $7, pricing_version = $8,
         error_code = $9, completed_at = $10
     WHERE id = $11
     RETURNING id, status, created_at`,
    [input.status, metrics.inputTokens, metrics.outputTokens, metrics.cachedTokens, metrics.units,
      input.currency ?? null, metrics.costMinor, input.pricingVersion ?? null,
      input.errorCode ?? null, input.completedAt ?? new Date(), id],
  );
}
