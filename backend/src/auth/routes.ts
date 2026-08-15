import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { createSession, getAuthUser, hashPassword, verifyPassword } from './service.js';

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
});

const registerSchema = credentialsSchema.extend({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_credentials' });

    const passwordHash = await hashPassword(parsed.data.password);
    try {
      const result = await db.query<{ id: string; email: string }>(
        `INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name`,
        [parsed.data.email, passwordHash, parsed.data.first_name ?? null, parsed.data.last_name ?? null],
      );
      const user = result.rows[0];
      if (!user) return reply.status(500).send({ error: 'registration_failed' });
      await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'author')`, [user.id]);
      const token = await createSession(user.id);
      return reply.status(201).send({ user, token });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return reply.status(409).send({ error: 'email_already_registered' });
      }
      throw error;
    }
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_credentials' });

    const result = await db.query<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash FROM users WHERE email = $1 AND is_active = TRUE`,
      [parsed.data.email],
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      return reply.status(401).send({ error: 'invalid_email_or_password' });
    }

    const token = await createSession(user.id);
    return reply.send({ user: { id: user.id, email: user.email }, token });
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return reply.status(204).send();
    const token = header.slice(7);
    const { hashSessionToken } = await import('./service.js');
    await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [hashSessionToken(token)]);
    return reply.status(204).send();
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    return reply.send({ user });
  });
}
