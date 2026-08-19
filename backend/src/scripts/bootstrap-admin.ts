import { hashPassword } from '../auth/service.js';
import { db } from '../db/pool.js';

const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';

if (!email || !email.includes('@')) throw new Error('bootstrap_admin_email_missing');
if (!password || password.length < 8) throw new Error('bootstrap_admin_password_missing_or_too_short');

const passwordHash = await hashPassword(password);
const client = await db.connect();
try {
  await client.query('BEGIN');
  const existing = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1 FOR UPDATE', [email]);
  let userId = existing.rows[0]?.id;
  if (userId) {
    await client.query('UPDATE users SET password_hash = $1, is_active = TRUE, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $2', [passwordHash, userId]);
  } else {
    const created = await client.query<{ id: string }>(
      'INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified_at) VALUES ($1, $2, $3, $4, TRUE, now()) RETURNING id',
      [email, passwordHash, 'Hadi', 'Jafari'],
    );
    userId = created.rows[0]?.id;
  }
  if (!userId) throw new Error('bootstrap_admin_user_not_created');
  for (const role of ['admin', 'senior_manager', 'technical_manager'] as const) {
    await client.query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, role]);
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ ok: true, email, userId, roles: ['admin', 'senior_manager', 'technical_manager'] }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await db.end();
}
