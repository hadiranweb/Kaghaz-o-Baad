import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppEnv } from '../../config/env.js';
import { getAuthUser } from '../../auth/service.js';
import { isCircuitBreakerOpen, recordFailure, recordSuccess } from '../circuit-breaker/service.js';
import { runUsage } from '../usage/gateway.js';
import { rewriteWithOpenAi, AiProviderError } from './openai-compatible.js';

const bodySchema = z.object({
  source: z.string().trim().min(30).max(100000),
  tone: z.string().trim().min(1).max(80).default('formal'),
  targetLang: z.enum(['fa', 'en']).default('fa'),
  length: z.string().trim().min(1).max(40).default('medium'),
  customPrompt: z.string().trim().max(2000).optional(),
  articleId: z.string().uuid().optional(),
});

function statusFor(error: unknown) {
  if (error instanceof AiProviderError) {
    if (error.code === 'ai_provider_not_configured') return 503;
    if (error.code === 'ai_provider_timeout') return 504;
    if (error.code.startsWith('ai_provider_http_')) return 502;
  }
  return 500;
}

export async function registerRewriteRoutes(app: FastifyInstance, env: AppEnv) {
  app.post('/api/v1/ai/rewrite', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = bodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    const requestHeader = request.headers['x-request-id'];
    const requestId = typeof requestHeader === 'string' ? requestHeader : request.id;
    try {
      const aiBreakerOpen = await isCircuitBreakerOpen('ai-provider');
      if (aiBreakerOpen) return reply.status(503).send({ error: 'ai_provider_circuit_breaker_open', requestId });
      const result = await runUsage(
        {
          userId: user.id,
          articleId: body.data.articleId,
          requestId,
          featureKey: 'ai.rewrite',
          toolName: 'academic-rewriter',
          provider: env.AI_PROVIDER,
          model: env.AI_MODEL,
          timeoutMs: env.AI_TIMEOUT_MS,
          metadata: { tone: body.data.tone, targetLang: body.data.targetLang, length: body.data.length },
        },
        async () => {
          const generated = await rewriteWithOpenAi(env, body.data);
          return { value: generated.content, metrics: generated.metrics };
        },
      );
      await recordSuccess('ai-provider');
      return reply.send({ ok: true, content: result.value, requestId: result.requestId, usageId: result.usageId, provider: env.AI_PROVIDER, model: env.AI_MODEL });
    } catch (error) {
      await recordFailure('ai-provider');
      const status = statusFor(error);
      if (status === 503) return reply.status(status).send({ error: 'ai_provider_not_configured' });
      if (status === 504) return reply.status(status).send({ error: 'ai_provider_timeout', requestId });
      return reply.status(status).send({ error: 'ai_provider_failed', requestId });
    }
  });
}
