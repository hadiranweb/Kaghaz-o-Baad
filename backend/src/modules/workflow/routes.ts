import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser } from '../../auth/service.js';
import { transitionArticle, workflowActions } from './service.js';

const bodySchema = z.object({
  action: z.enum(workflowActions),
  note: z.string().max(4000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerWorkflowRoutes(app: FastifyInstance) {
  app.post('/api/v1/articles/:articleId/workflow', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor) return reply.status(401).send({ error: 'unauthorized' });

    const params = z.object({ articleId: z.string().uuid() }).safeParse(request.params);
    const body = bodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });

    const requestHeader = request.headers['x-request-id'];
    const requestId = typeof requestHeader === 'string' ? requestHeader : request.id;

    try {
      const transition = await transitionArticle({
        articleId: params.data.articleId,
        action: body.data.action,
        note: body.data.note,
        metadata: body.data.metadata,
        actor,
        requestId,
      });
      return reply.send({ ok: true, transition });
    } catch (error: unknown) {
      const statusCode = error && typeof error === 'object' && 'statusCode' in error
        ? Number(error.statusCode)
        : 500;
      const code = error instanceof Error ? error.message : 'workflow_failed';
      if (statusCode === 404) return reply.status(404).send({ error: 'article_not_found' });
      if (statusCode === 403) return reply.status(403).send({ error: 'forbidden_transition' });
      if (statusCode === 409) return reply.status(409).send({ error: code });
      throw error;
    }
  });
}
