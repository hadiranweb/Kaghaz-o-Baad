import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppEnv } from '../../config/env.js';
import { db } from '../../db/pool.js';
import { getAuthUser, hasRole } from '../../auth/service.js';

function allowed(user: { roles: string[] }) {
  return hasRole(user, 'admin', 'senior_manager', 'technical_manager');
}

export async function registerAdminAuthRoutes(app: FastifyInstance, env: AppEnv) {
  app.get('/api/v1/admin/auth/config', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!allowed(user)) return reply.status(403).send({ error: 'forbidden' });
    return reply.send({
      email: {
        provider: env.EMAIL_PROVIDER,
        configured: env.EMAIL_PROVIDER !== 'none' && Boolean(env.EMAIL_FROM),
        from: env.EMAIL_FROM ?? null,
      },
      oauth: {
        google: { configured: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET), redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI ?? `${env.BACKEND_PUBLIC_URL}/api/v1/auth/oauth/google/callback` },
        github: { configured: Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET), redirectUri: env.GITHUB_OAUTH_REDIRECT_URI ?? `${env.BACKEND_PUBLIC_URL}/api/v1/auth/oauth/github/callback` },
      },
    });
  });

  app.get('/api/v1/admin/auth/events', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!allowed(user)) return reply.status(403).send({ error: 'forbidden' });
    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50), outcome: z.enum(['success', 'failure', 'blocked']).optional(), provider: z.string().max(30).optional() }).safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'invalid_query' });
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (query.data.outcome) { values.push(query.data.outcome); conditions.push(`outcome = $${values.length}`); }
    if (query.data.provider) { values.push(query.data.provider); conditions.push(`provider = $${values.length}`); }
    values.push(query.data.limit);
    const result = await db.query(
      `SELECT id, request_id, user_id, email, provider, event_type, outcome, error_code, ip_address, user_agent, latency_ms, metadata, created_at
       FROM auth_events ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT $${values.length}`,
      values,
    );
    return reply.send({ ok: true, events: result.rows });
  });
}
