import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';

function allowed(user: { roles: string[] }) { return hasRole(user, 'admin', 'senior_manager', 'technical_manager'); }
const serviceSchema = z.object({ service: z.string().trim().min(1).max(120) });

export async function registerCircuitRoutes(app: FastifyInstance) {
  app.get('/api/v1/admin/circuit-breakers', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!allowed(user)) return reply.status(403).send({ error: 'forbidden' });
    const result = await db.query('SELECT service_name, state, failure_count, last_failure_at, opened_at, cooldown_seconds, updated_at FROM circuit_breakers ORDER BY service_name');
    return reply.send({ ok: true, breakers: result.rows });
  });

  app.post('/api/v1/admin/circuit-breakers/reset', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!allowed(user)) return reply.status(403).send({ error: 'forbidden' });
    const body = serviceSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    await db.query(`INSERT INTO circuit_breakers (service_name, state, failure_count, opened_at, updated_at) VALUES ($1, 'CLOSED', 0, NULL, now()) ON CONFLICT (service_name) DO UPDATE SET state = 'CLOSED', failure_count = 0, opened_at = NULL, updated_at = now()`, [body.data.service]);
    return reply.send({ ok: true });
  });

  app.post('/api/v1/admin/circuit-breakers/trip-test', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!allowed(user)) return reply.status(403).send({ error: 'forbidden' });
    const body = serviceSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    await db.query(`INSERT INTO circuit_breakers (service_name, state, failure_count, opened_at, updated_at) VALUES ($1, 'OPEN', 1, now(), now()) ON CONFLICT (service_name) DO UPDATE SET state = 'OPEN', failure_count = circuit_breakers.failure_count + 1, opened_at = now(), updated_at = now()`, [body.data.service]);
    return reply.send({ ok: true });
  });
}
