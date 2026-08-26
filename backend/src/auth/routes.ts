import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/pool.js';
import { createSession, getAuthUser, hashPassword, verifyPassword } from './service.js';
import { sendSmsIrVerificationCode, SmsProviderError } from './smsir.js';
import { sendEmailVerification, EmailProviderError } from './email.js';
import { recordAuthEvent } from './audit.js';
import { enforceRateLimit, RateLimitExceededError } from '../modules/rate-limit/service.js';
import { enqueueMailboxCreateTx } from '../modules/mail/mailbox-provisioning.js';
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
const verifyFactorCodeSchema = verifyPhoneCodeSchema;
const verifyEmailSchema = z.object({ token: z.string().trim().min(20).max(200) });

export function normalizePhone(input: string) {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const translated = input
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
  const digits = translated.replace(/[^0-9]/g, '');
  const withoutCountry = digits.startsWith('0098') ? digits.slice(4) : digits.startsWith('98') ? digits.slice(2) : digits;
  const national = withoutCountry.startsWith('0') ? withoutCountry.slice(1) : withoutCountry;
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
    let phone: string | null = null;
    if (parsed.data.phone) {
      try { phone = normalizePhone(parsed.data.phone); } catch { return reply.status(400).send({ error: 'invalid_phone' }); }
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const rawToken = randomBytes(32).toString('base64url');
    const existingUser = await db.query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [parsed.data.email]);
    if (existingUser.rows[0]) return reply.status(409).send({ error: 'email_already_registered' });
    try {
      await sendEmailVerification({ env, email: parsed.data.email, token: rawToken });
      await db.query(
        `INSERT INTO pending_email_registrations (email, password_hash, first_name, last_name, phone, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' seconds')::interval)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, consumed_at = NULL`,
        [parsed.data.email, passwordHash, parsed.data.first_name ?? null, parsed.data.last_name ?? null, phone, hashCode(rawToken), env.EMAIL_VERIFICATION_TTL_SECONDS],
      );
      return reply.status(202).send({ pending: true, expires_in_seconds: env.EMAIL_VERIFICATION_TTL_SECONDS });
    } catch (error: unknown) {
      if (error instanceof EmailProviderError) {
        request.log.warn({ provider: error.provider, providerStatus: error.providerStatus, statusCode: error.statusCode }, 'email verification delivery failed');
        return reply.status(error.statusCode).send({ error: error.message });
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply.status(409).send({ error: 'email_already_registered' });
      throw error;
    }
  });

  app.get('/api/v1/auth/verify-email', async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_verification_token' });
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const pendingResult = await client.query<{ id: string; email: string; password_hash: string; first_name: string | null; last_name: string | null; phone: string | null }>(
        `SELECT id, email, password_hash, first_name, last_name, phone FROM pending_email_registrations WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now() FOR UPDATE`,
        [hashCode(parsed.data.token)],
      );
      const pending = pendingResult.rows[0];
      if (!pending) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: 'invalid_or_expired_verification_token' });
      }
      const platformLocalpart = `user-${randomUUID().replaceAll('-', '')}`;
      const platformEmail = `${platformLocalpart}@${env.LIARA_MAIL_DOMAIN.toLowerCase()}`;
      const created = await client.query<{ id: string; email: string; first_name: string | null; last_name: string | null; platform_email: string }>(
        `INSERT INTO users
           (email, password_hash, first_name, last_name, email_verified_at, platform_email, platform_email_localpart, identity_status)
         VALUES ($1, $2, $3, $4, now(), $5, $6, 'active')
         RETURNING id, email, first_name, last_name, platform_email`,
        [pending.email, pending.password_hash, pending.first_name, pending.last_name, platformEmail, platformLocalpart],
      );
      const user = created.rows[0];
      if (!user) throw new Error('registration_failed');
      await client.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'author') ON CONFLICT DO NOTHING`, [user.id]);
      if (pending.phone) {
        await client.query(`INSERT INTO profiles (user_id, phone) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone`, [user.id, pending.phone]);
        await client.query(
          `INSERT INTO user_contact_methods (user_id, kind, value, normalized_value, is_primary, is_login_enabled)
           VALUES ($1, 'phone', $2, $2, FALSE, TRUE) ON CONFLICT (kind, normalized_value) DO NOTHING`,
          [user.id, pending.phone],
        );
      }
      await client.query(
        `INSERT INTO user_login_identities (user_id, provider, provider_subject, provider_email, is_verified, verified_at)
         VALUES ($1, 'password_email', $2, $2, TRUE, now()) ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [user.id, pending.email],
      );
      await client.query(
        `INSERT INTO user_contact_methods (user_id, kind, value, normalized_value, is_primary, is_login_enabled, verified_at, verification_method, last_verified_at)
         VALUES ($1, 'email', $2, $2, TRUE, TRUE, now(), 'email_link', now()) ON CONFLICT (kind, normalized_value) DO NOTHING`,
        [user.id, pending.email],
      );
      await enqueueMailboxCreateTx(client, {
        userId: user.id,
        platformEmail: user.platform_email,
        config: { enabled: env.MAILBOX_PROVISIONING_ENABLED, domain: env.LIARA_MAIL_DOMAIN, mailServerId: env.LIARA_MAIL_SERVER_ID },
      });
      await client.query(`UPDATE pending_email_registrations SET consumed_at = now() WHERE id = $1`, [pending.id]);
      await client.query('COMMIT');
      const token = await createSession(user.id);
      return reply.send({ user, token });
    } catch (error: unknown) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply.status(409).send({ error: 'email_already_registered' });
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const startedAt = Date.now();
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      await recordAuthEvent({ request, eventType: 'password_login', outcome: 'failure', errorCode: 'invalid_credentials', startedAt });
      return reply.status(400).send({ error: 'invalid_credentials' });
    }
    const result = await db.query<{ id: string; email: string; password_hash: string }>(`SELECT id, email, password_hash FROM users WHERE email = $1 AND is_active = TRUE`, [parsed.data.email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      await recordAuthEvent({ request, eventType: 'password_login', outcome: 'failure', email: parsed.data.email, errorCode: 'invalid_email_or_password', startedAt });
      return reply.status(401).send({ error: 'invalid_email_or_password' });
    }
    const token = await createSession(user.id);
    await recordAuthEvent({ request, eventType: 'password_login', outcome: 'success', userId: user.id, email: user.email, startedAt });
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
      if (error instanceof SmsProviderError) {
        request.log.warn({ providerStatus: error.providerStatus, statusCode: error.statusCode }, 'phone OTP delivery failed');
        return reply.status(error.statusCode).send({ error: error.message });
      }
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
    await db.query(`UPDATE profiles SET phone_verified_at = COALESCE(phone_verified_at, now()), updated_at = now() WHERE user_id = $1 AND phone = $2`, [user.id, phone]);
    const token = await createSession(user.id);
    const roles = await db.query<{ role: string }>(`SELECT role::text FROM user_roles WHERE user_id = $1 ORDER BY role`, [user.id]);
    return reply.send({ user: { ...user, phone, phone_verified: true, roles: roles.rows.map((row) => row.role) }, token });
  });

  app.post('/api/v1/auth/phone/verify-factor/send-code', async (request, reply) => {
    const authUser = await getAuthUser(request);
    if (!authUser) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = sendPhoneCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_phone' });
    let phone: string;
    try { phone = normalizePhone(parsed.data.phone); } catch { return reply.status(400).send({ error: 'invalid_phone' }); }
    const current = await db.query<{ phone: string | null; phone_verified_at: Date | null }>(`SELECT phone, phone_verified_at FROM profiles WHERE user_id = $1`, [authUser.id]);
    const currentProfile = current.rows[0];
    if (currentProfile?.phone_verified_at && currentProfile.phone === phone) return reply.status(409).send({ error: 'phone_already_verified' });
    try {
      await enforceRateLimit({ key: `${authUser.id}:factor:${phone}`, config: { name: 'auth:phone:factor:send', limit: 1, windowSeconds: 60 } });
      await enforceRateLimit({ key: requestIp(request), config: { name: 'auth:phone:factor:send:ip', limit: 5, windowSeconds: 600 } });
    } catch (error) {
      if (error instanceof RateLimitExceededError) return handleRateLimit(reply, error);
      throw error;
    }
    const code = String(randomInt(100000, 1000000));
    const inserted = await db.query<{ id: string }>(`INSERT INTO phone_login_codes (phone, code_hash, purpose, expires_at, request_id) VALUES ($1, $2, 'phone_verification', now() + ($3 || ' seconds')::interval, $4) RETURNING id`, [phone, hashCode(code), env.OTP_TTL_SECONDS, request.id]);
    try {
      const sms = await sendSmsIrVerificationCode({ env, phone: `98${phone.slice(1)}`, code });
      await db.query(`UPDATE phone_login_codes SET provider_message_id = $1 WHERE id = $2`, [sms.messageId ?? null, inserted.rows[0]?.id]);
      return reply.send({ ok: true, expires_in_seconds: env.OTP_TTL_SECONDS });
    } catch (error) {
      await db.query(`UPDATE phone_login_codes SET consumed_at = now() WHERE id = $1`, [inserted.rows[0]?.id]);
      if (error instanceof SmsProviderError) {
        request.log.warn({ providerStatus: error.providerStatus, statusCode: error.statusCode }, 'phone factor delivery failed');
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post('/api/v1/auth/phone/verify-factor', async (request, reply) => {
    const authUser = await getAuthUser(request);
    if (!authUser) return reply.status(401).send({ error: 'unauthorized' });
    const parsed = verifyFactorCodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_code' });
    let phone: string;
    try { phone = normalizePhone(parsed.data.phone); } catch { return reply.status(400).send({ error: 'invalid_phone' }); }
    try { await enforceRateLimit({ key: `${authUser.id}:${phone}:${requestIp(request)}`, config: { name: 'auth:phone:factor:verify', limit: 10, windowSeconds: 600 } }); }
    catch (error) { if (error instanceof RateLimitExceededError) return handleRateLimit(reply, error); throw error; }
    const codeResult = await db.query<{ id: string; code_hash: string; expires_at: Date; attempts: number }>(`SELECT id, code_hash, expires_at, attempts FROM phone_login_codes WHERE phone = $1 AND purpose = 'phone_verification' AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [phone]);
    const pending = codeResult.rows[0];
    if (!pending || pending.expires_at.getTime() <= Date.now() || pending.attempts >= env.OTP_MAX_ATTEMPTS) return reply.status(401).send({ error: 'invalid_or_expired_code' });
    await db.query(`UPDATE phone_login_codes SET attempts = attempts + 1 WHERE id = $1`, [pending.id]);
    const expected = Buffer.from(pending.code_hash, 'hex');
    const actual = Buffer.from(hashCode(parsed.data.code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return reply.status(401).send({ error: 'invalid_or_expired_code' });
    await db.query(`UPDATE phone_login_codes SET consumed_at = now() WHERE id = $1`, [pending.id]);
    await db.query(`INSERT INTO profiles (user_id, phone, phone_verified_at) VALUES ($1, $2, now()) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone, phone_verified_at = now(), updated_at = now()`, [authUser.id, phone]);
    return reply.send({ ok: true, phone, phone_verified: true });
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
