import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole, hashPassword } from '../../auth/service.js';
import { db } from '../../db/pool.js';

const roleSchema = z.enum(['admin', 'editor', 'contributor', 'user']);
const bodySchema = z.object({
  action: z.enum(['list', 'setRole', 'deleteUser', 'updateUser']),
  userId: z.string().uuid().optional(),
  role: roleSchema.optional(),
  enabled: z.boolean().optional(),
  email: z.string().email().optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  password: z.string().min(8).max(200).optional(),
});

function isAdmin(user: { roles: string[] }) { return hasRole(user, 'admin', 'senior_manager'); }

export async function registerAdminUsersRoutes(app: FastifyInstance) {
  app.post('/api/v1/admin/users', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor || !isAdmin(actor)) return reply.status(actor ? 403 : 401).send({ error: actor ? 'forbidden' : 'unauthorized' });
    const body = bodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    const d = body.data;
    if (d.action === 'list') {
      const result = await db.query(`
        SELECT u.id, u.email, u.created_at,
               NULL::timestamptz AS last_sign_in_at,
               u.email_verified_at AS email_confirmed_at,
               COALESCE(array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles,
               jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'phone', p.phone) AS profile
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN profiles p ON p.user_id = u.id
        GROUP BY u.id, p.id ORDER BY u.created_at DESC`);
      return reply.send({ ok: true, users: result.rows });
    }
    if (!d.userId) return reply.status(400).send({ error: 'user_id_required' });
    if (d.action === 'setRole') {
      if (!d.role || d.enabled === undefined) return reply.status(400).send({ error: 'role_and_enabled_required' });
      if (d.enabled) await db.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [d.userId, d.role]);
      else await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role = $2', [d.userId, d.role]);
      return reply.send({ ok: true });
    }
    if (d.action === 'deleteUser') {
      if (d.userId === actor.id) return reply.status(409).send({ error: 'cannot_delete_current_user' });
      await db.query('DELETE FROM users WHERE id = $1', [d.userId]);
      return reply.send({ ok: true });
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    if (d.email !== undefined) { values.push(d.email); updates.push(`email = $${values.length}`); }
    if (d.password) { values.push(await hashPassword(d.password)); updates.push(`password_hash = $${values.length}`); }
    if (updates.length) { values.push(d.userId); await db.query(`UPDATE users SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values); }
    const profileFields: string[] = [];
    const profileValues: unknown[] = [];
    if (d.firstName !== undefined) { profileValues.push(d.firstName); profileFields.push(`first_name = $${profileValues.length}`); }
    if (d.lastName !== undefined) { profileValues.push(d.lastName); profileFields.push(`last_name = $${profileValues.length}`); }
    if (d.phone !== undefined) { profileValues.push(d.phone); profileFields.push(`phone = $${profileValues.length}`); }
    if (profileFields.length) { profileValues.push(d.userId); await db.query(`UPDATE profiles SET ${profileFields.join(', ')}, updated_at = now() WHERE user_id = $${profileValues.length}`, profileValues); }
    return reply.send({ ok: true, forcedPasswordChange: Boolean(d.password) });
  });
}
