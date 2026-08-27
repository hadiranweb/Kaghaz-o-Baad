import type { FastifyInstance } from 'fastify';
import type { AppEnv } from '../../config/env.js';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { studioReadiness } from './service.js';

export async function registerStudioRoutes(app: FastifyInstance, env: AppEnv) {
  app.get('/api/v1/admin/studio/readiness', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!hasRole(user, 'admin', 'senior_manager', 'technical_manager')) {
      return reply.status(403).send({ error: 'forbidden' });
    }
    return reply.send({ ok: true, studio: studioReadiness(env) });
  });
}
