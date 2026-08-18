import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { createSession, getAuthUser, hashPassword, verifyPassword } from './service.js';
import { sendSmsIrVerificationCode, SmsProviderError } from './smsir.js';
import { enforceRateLimit, RateLimitExceededError } from '../modules/rate-limit/service.js';
import type { AppEnv } from '../config/env.js';

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(200),
});

const registerSchema = credentialsSchema.extend({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
});
const phoneSchema = z.string().trim().min(8).max(30);
const sendPhoneCodeSchema = z.object({ phone: phoneSchema });
const verifyPhoneCodeSchema = z.object({ phone: phoneSchema, code: z.string().trim().regex(/^\d{6}$/) });

function normalizePhone(input: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const translated = input
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
  const digits = translated.replace(/[^0-9]/g, '');
  const national = digits.startsWith('0098') ? digits.slice(4) : digits.startsWith('98') ? digits.slice(2) : digits;
  if (!/^9\d{9}$/.test(national)) throw new Error('invalid_phone');
  return `0${national}`;
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function requestIp(request: FastifyRequest) {
  return request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
}

function handleRateLimit(reply: { header: (name: string, value: string) => unknown; status: (code: number) => { send: (payload: unknown) => unknown } }, error: RateLimitExceededError) {
  reply.header('retry-after', String(error.retryAfterSeconds));
  return reply.status(429).send({ error: error.message, retry_after_seconds: error.retryAfterSeconds });
}

export async function registerAuthRoutes(app: FastifyInstance, env: AppEnv) {
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
      if (parsed.data.phone) await db.query(`INSERT INTO profiles (user_id, phone) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone`, [user.id, normalizePhone(parsed.data.phone)]);
      const token = await createSession(user.id);
      return reply.status(201).send({ user, token });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply.status(409).send({ error: 'email_already_registered' });
      throw error;
    }
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_credentials' });
    const result = await db.query<{ id: string; email: string; password_hash: string }>(`SELECT id, email, password_hash FROM users WHERE email = $1 AND is_active = TRUE`, [parsed.data.email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) return reply.status(401).send({ error: 'invalid_email_or_password' });
    const token = await createSession(user.id);
    return reply.send({ user: { id: user.id, email: user.email }, token });
  });

  app.post('/api/v1/auth/phone/send-code', async (request, reply) => {
    const parsed = sendPhoneCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_phone' });
    let phone: string;
    try { phone = normalizePhone(parsed.data.phone); } catch { return reply.status(400).send({ error: 'invalid_phone' }); }
    try {
      await enforceRateLimit({ key: phone, config: { name: 'auth:phone:send', limit: 1, windowSeconds: 60 } });
      await enforceRateLimit({ key: requestIp(request), config: { name: 'auth:phone:send:ip', limit: 5, windowSeconds: 600 } });
    } catch (error) {
      if (error instanceof RateLimitExceededError) return handleRateLimit(reply, error);
      throw error;
    }
    const code = String(randomInt(100000, 1000000));
    const inserted = await db.query<{ id: string }>(`INSERT INTO phone_login_codes (phone, code_hash, expires_at, request_id) VALUES ($1, $2, now() + ($3 || ' seconds')::interval, $4) RETURNING id`, [phone, hashCode(code), env.OTP_TTL_SECONDS, request.id]);
    try {
      const sms = await sendSmsIrVerificationCode({ env, phone: `98${phone.slice(1)}`, code });
      await db.query(`UPDATE phone_login_codes SET provider_message_id = $1 WHERE id = $2`, [sms.messageId ?? null, inserted.rows[0]?.id]);
      return reply.send({ ok: true, expires_in_seconds: env.OTP_TTL_SECONDS });
    } catch (error) {
      await db.query(`UPDATE phone_login_codes SET consumed_at = now() WHERE id = $1`, [inserted.rows[0]?.id]);
      if (error instanceof SmsProviderError) return reply.status(error.statusCode).send({ error: error.message });
      throw error;
    }
  });

  app.post('/api/v1/auth/phone/verify-code', async (request, reply) => {
    const parsed = verifyPhoneCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_code' });
    let phone: string;
    try { phone = normalizePhone(parsed.data.phone); } catch { return reply.status(400).send({ error: 'invalid_phone' }); }
    try { await enforceRateLimit({ key: `${phone}:${requestIp(request)}`, config: { name: 'auth:phone:verify', limit: 10, windowSeconds: 600 } }); }
    catch (error) { if (error instanceof RateLimitExceededError) return handleRateLimit(reply, error); throw error; }

    const codeResult = await db.query<{ id: string; code_hash: string; expires_at: Date; attempts: number }>(`SELECT id, code_hash, expires_at, attempts FROM phone_login_codes WHERE phone = $1 AND purpose = 'login' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [phone]);
    const pending = codeResult.rows[0];
    if (!pending || pending.expires_at.getTime() <= Date.now() || pending.attempts >= env.OTP_MAX_ATTEMPTS) return reply.status(401).send({ error: 'invalid_or_expired_code' });
    await db.query(`UPDATE phone_login_codes SET attempts = attempts + 1 WHERE id = $1`, [pending.id]);
    const expected = Buffer.from(pending.code_hash, 'hex');
    const actual = Buffer.from(hashCode(parsed.data.code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return reply.status(401).send({ error: 'invalid_or_expired_code' });
    await db.query(`UPDATE phone_login_codes SET consumed_at = now() WHERE id = $1`, [pending.id]);

    const existing = await db.query<{ id: string; email: string; first_name: string | null; last_name: string | null }>(`SELECT u.id, u.email, u.first_name, u.last_name FROM users u JOIN profiles p ON p.user_id = u.id WHERE p.phone = $1 AND u.is_active = TRUE LIMIT 1`, [phone]);
    let user = existing.rows[0];
    if (!user) {
      const syntheticEmail = `${phone}@phone.kaghazbaad.local`;
      const passwordHash = await hashPassword(randomBytes(24).toString('base64url'));
      const created = await db.query<{ id: string; email: string; first_name: string | null; last_name: string | null }>(`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, first_name, last_name`, [syntheticEmail, passwordHash]);
      const createdUser = created.rows[0];
      if (!createdUser) return reply.status(500).send({ error: 'phone_registration_failed' });
      user = createdUser;
      await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'author') ON CONFLICT DO NOTHING`, [createdUser.id]);
      await db.query(`INSERT INTO profiles (user_id, phone) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone`, [createdUser.id, phone]);
    }
    if (!user) return reply.status(500).send({ error: 'phone_registration_failed' });
    const token = await createSession(user.id);
    const roles = await db.query<{ role: string }>(`SELECT role::text FROM user_roles WHERE user_id = $1 ORDER BY role`, [user.id]);
    return reply.send({ user: { ...user, phone, roles: roles.rows.map((row) => row.role) }, token });
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
