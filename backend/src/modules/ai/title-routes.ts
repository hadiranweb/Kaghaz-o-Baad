import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppEnv } from '../../config/env.js';
import { getAuthUser } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import { suggestTitlesWithOpenAi } from './openai-compatible.js';
import { runUsage } from '../usage/gateway.js';
import { commitQuota, releaseQuota, reserveQuota, QuotaExceededError, QuotaNotConfiguredError } from '../quota/service.js';
import { enforceRateLimit, RateLimitExceededError } from '../rate-limit/service.js';
import { getCachedTitleSuggestions, putCachedTitleSuggestions } from '../cache/ai-response-cache.js';
import { insertUsageEvent } from '../usage/repository.js';

const paramsSchema = z.object({ articleId: z.string().uuid() });
const bodySchema = z.object({
  topic: z.string().trim().min(3).max(4000),
  locale: z.enum(['fa', 'en']).default('fa'),
  count: z.number().int().min(1).max(10).optional(),
});

function errorStatus(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    if (code === 'ai_provider_not_configured') return 503;
    if (code === 'ai_provider_timeout') return 504;
    if (code.startsWith('ai_provider_http_')) return 502;
    if (code.startsWith('ai_provider_')) return 502;
  }
  return 500;
}

export async function registerTitleSuggestionRoutes(app: FastifyInstance, env: AppEnv) {
  app.post('/api/v1/articles/:articleId/title-suggestions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });

    const articleResult = await db.query<{ id: string; author_id: string | null }>(
      'SELECT id, author_id FROM articles WHERE id = $1',
      [params.data.articleId],
    );
    const article = articleResult.rows[0];
    if (!article) return reply.status(404).send({ error: 'article_not_found' });
    const privileged = user.roles.some((role) => ['editor', 'admin', 'senior_manager', 'technical_manager'].includes(role));
    if (!privileged && article.author_id !== user.id) return reply.status(403).send({ error: 'forbidden' });

    const requestHeader = request.headers['x-request-id'];
    const requestId = typeof requestHeader === 'string' ? requestHeader : request.id;
    let reservation;
    try {
      if (env.RATE_LIMIT_ENABLED) {
        const ipLimit = await enforceRateLimit({ key: `ip:${request.ip}`, config: { name: 'api-ip', limit: env.RATE_LIMIT_IP_PER_MINUTE, windowSeconds: 60 } });
        const userLimit = await enforceRateLimit({ key: `user:${user.id}`, config: { name: 'api-user', limit: env.RATE_LIMIT_USER_PER_MINUTE, windowSeconds: 60 } });
        const aiLimit = await enforceRateLimit({ key: `user:${user.id}:ai:title_suggestions`, config: { name: 'ai-title', limit: env.RATE_LIMIT_AI_PER_MINUTE, windowSeconds: 60 } });
        reply.header('RateLimit-Limit', aiLimit.limit);
        reply.header('RateLimit-Remaining', aiLimit.remaining);
        reply.header('RateLimit-Reset', Math.floor(aiLimit.resetAt.getTime() / 1000));
        void ipLimit;
        void userLimit;
      }
      const cacheInput = {
        userId: user.id,
        topic: body.data.topic,
        locale: body.data.locale,
        count: body.data.count ?? 5,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        promptVersion: env.AI_TITLE_PROMPT_VERSION,
      } as const;
      if (env.AI_CACHE_ENABLED) {
        const cached = await getCachedTitleSuggestions(cacheInput).catch(() => null);
        if (cached) {
          const now = new Date();
          const usage = await insertUsageEvent({
            userId: user.id,
            articleId: article.id,
            requestId,
            featureKey: 'ai.title_suggestions',
            toolName: 'academic-title-suggestion',
            provider: env.AI_PROVIDER,
            model: env.AI_MODEL,
            pricingVersion: undefined,
            status: 'succeeded',
            inputTokens: 0,
            outputTokens: 0,
            cachedTokens: 0,
            units: 0,
            metadata: { cache_hit: true, cache_key: cached.key },
            startedAt: now,
            completedAt: now,
          });
          return reply.send({ ok: true, cacheHit: true, requestId, usageId: usage.rows[0]?.id, provider: env.AI_PROVIDER, model: env.AI_MODEL, suggestions: cached.value.suggestions });
        }
      }
      reservation = await reserveQuota({
        userId: user.id,
        requestId,
        featureKey: 'ai.title_suggestions',
        units: 1,
      });
      const result = await runUsage(
        {
          userId: user.id,
          articleId: article.id,
          requestId,
          featureKey: 'ai.title_suggestions',
          toolName: 'academic-title-suggestion',
          provider: env.AI_PROVIDER,
          model: env.AI_MODEL,
          timeoutMs: env.AI_TIMEOUT_MS,
          metadata: { locale: body.data.locale, count: body.data.count ?? 5 },
        },
        async () => {
          const generated = await suggestTitlesWithOpenAi(env, body.data);
          return {
            value: generated.suggestions,
            metrics: generated.metrics,
          };
        },
      );
      await commitQuota(reservation);
      if (env.AI_CACHE_ENABLED) {
        await putCachedTitleSuggestions(cacheInput, result.value, env.AI_TITLE_CACHE_TTL_SECONDS).catch(() => undefined);
      }
      return reply.send({
        ok: true,
        requestId: result.requestId,
        usageId: result.usageId,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        suggestions: result.value,
      });
    } catch (error) {
      if (reservation) await releaseQuota(reservation).catch(() => undefined);
      if (error instanceof RateLimitExceededError) {
        reply.header('RateLimit-Limit', error.limit);
        reply.header('RateLimit-Remaining', error.remaining);
        reply.header('Retry-After', error.retryAfterSeconds);
        return reply.status(429).send({ error: 'rate_limit_exceeded', retryAfterSeconds: error.retryAfterSeconds, requestId });
      }
      if (error instanceof QuotaExceededError) return reply.status(429).send({ error: 'quota_exceeded', featureKey: error.featureKey, remaining: error.remaining, requestId });
      if (error instanceof QuotaNotConfiguredError) return reply.status(403).send({ error: 'quota_not_configured', featureKey: error.featureKey, requestId });
      const status = errorStatus(error);
      if (status < 500) return reply.status(status).send({ error: error instanceof Error ? error.message : 'ai_provider_failed' });
      if (status === 503) return reply.status(503).send({ error: 'ai_provider_not_configured' });
      if (status === 504) return reply.status(504).send({ error: 'ai_provider_timeout', requestId });
      return reply.status(status).send({ error: 'ai_provider_failed', requestId });
    }
  });
}
