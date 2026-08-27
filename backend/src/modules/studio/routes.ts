import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppEnv } from '../../config/env.js';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { capabilitiesForContext, STUDIO_CATALOG_VERSION, type StudioCapabilityContext } from './catalog.js';
import { studioReadiness } from './service.js';

const catalogQuerySchema = z.object({
  context: z.enum(['article', 'publication', 'live', 'media', 'community', 'operations']).optional(),
});

export async function registerStudioRoutes(app: FastifyInstance, env: AppEnv) {
  app.get('/api/v1/studio/catalog', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const query = catalogQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'invalid_input' });
    const context = query.data.context as StudioCapabilityContext | undefined;
    const readiness = studioReadiness(env);
    const capabilities = capabilitiesForContext(context).map((item) => ({
      ...item,
      enabled: false,
      status: 'disabled' as const,
      activationBlockedByFa: item.activationBlockedByFa,
    }));
    return reply.send({
      ok: true,
      catalogVersion: STUDIO_CATALOG_VERSION,
      connection: {
        externalStudioConfigured: readiness.externalStudioConfigured,
        provider: readiness.provider,
      },
      capabilities,
    });
  });

  app.get('/api/v1/admin/studio/readiness', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!hasRole(user, 'admin', 'senior_manager', 'technical_manager')) {
      return reply.status(403).send({ error: 'forbidden' });
    }
    return reply.send({ ok: true, studio: studioReadiness(env) });
  });
}
