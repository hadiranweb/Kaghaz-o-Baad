import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser } from '../../auth/service.js';
import { getQuotaStatus } from './service.js';

const querySchema = z.object({
  featureKey: z.string().trim().min(1).max(200).default('ai.title_suggestions'),
});

export async function registerQuotaRoutes(app: FastifyInstance) {
  app.get('/api/v1/me/quota', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    const quota = await getQuotaStatus(user.id, parsed.data.featureKey);
    return reply.send({ ok: true, quota });
  });
}
