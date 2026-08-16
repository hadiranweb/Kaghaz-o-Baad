import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hashPassword } from './service.js';
import { db } from '../db/pool.js';

const schema = z.object({ password: z.string().min(8).max(200) });

export async function registerPasswordRoute(app: FastifyInstance) {
  app.patch('/api/v1/auth/password', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = schema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_password' });

    const passwordHash = await hashPassword(body.data.password);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [passwordHash, user.id],
    );
    return reply.send({ ok: true });
  });
}
