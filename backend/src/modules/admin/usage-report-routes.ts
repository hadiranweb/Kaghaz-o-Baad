import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function canViewCosts(user: { roles: string[] }) {
  return hasRole(user, 'admin', 'senior_manager', 'technical_manager');
}

export async function registerUsageReportRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/usage-report', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!canViewCosts(user)) return reply.status(403).send({ error: 'forbidden' });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });

    const to = parsed.data.to ?? new Date();
    const from = parsed.data.from ?? new Date(to.getTime() - 30 * 86_400_000);
    if (from >= to || to.getTime() - from.getTime() > 90 * 86_400_000) {
      return reply.status(400).send({ error: 'invalid_date_range' });
    }
    const rows = await db.query(
      `WITH grouped AS (
         SELECT provider, model, feature_key,
                COUNT(*)::int AS requests,
                COUNT(*) FILTER (WHERE metadata->>'cache_hit' = 'true')::int AS cache_hits,
                COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
                COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
                COALESCE(SUM(cached_tokens), 0)::int AS cached_tokens,
                COALESCE(SUM(cost_minor), 0)::bigint AS provider_cost_minor,
                COALESCE(AVG(cost_minor) FILTER (
                  WHERE status = 'succeeded' AND COALESCE(metadata->>'cache_hit', 'false') <> 'true' AND cost_minor IS NOT NULL
                ), 0)::numeric AS avg_uncached_cost_minor
         FROM usage_events
         WHERE created_at >= $1 AND created_at < $2
         GROUP BY provider, model, feature_key
       )
       SELECT provider, model, feature_key, requests, cache_hits, input_tokens, output_tokens,
              cached_tokens, provider_cost_minor,
              ROUND(avg_uncached_cost_minor * cache_hits)::bigint AS estimated_savings_minor
       FROM grouped ORDER BY provider, model, feature_key`,
      [from, to],
    );
    const totals = rows.rows.reduce((sum, row) => ({
      requests: sum.requests + Number(row.requests),
      cacheHits: sum.cacheHits + Number(row.cache_hits),
      inputTokens: sum.inputTokens + Number(row.input_tokens),
      outputTokens: sum.outputTokens + Number(row.output_tokens),
      cachedTokens: sum.cachedTokens + Number(row.cached_tokens),
      providerCostMinor: sum.providerCostMinor + Number(row.provider_cost_minor),
      estimatedSavingsMinor: sum.estimatedSavingsMinor + Number(row.estimated_savings_minor),
    }), { requests: 0, cacheHits: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, providerCostMinor: 0, estimatedSavingsMinor: 0 });
    return reply.send({ ok: true, period: { from: from.toISOString(), to: to.toISOString() }, totals, rows: rows.rows });
  });
}
