import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyRequest } from 'fastify';
import { db } from '../db/pool.js';

export * from './roles.js';
export * from './phone.js';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  has_verified_factor: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) throw new Error('password_too_short');
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, hash] = encoded.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, tokenHash, SESSION_DAYS],
  );
  return token;
}

export async function getAuthUser(request: FastifyRequest): Promise<AuthUser | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const tokenHash = hashSessionToken(header.slice(7));
  const result = await db.query<{ id: string; email: string; roles: string[]; email_verified: boolean; phone: string | null; phone_verified: boolean; has_verified_factor: boolean }>(
    `SELECT u.id, u.email,
            COALESCE(array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles,
            (u.email_verified_at IS NOT NULL) AS email_verified,
            p.phone,
            (p.phone_verified_at IS NOT NULL) AS phone_verified,
            ((u.email_verified_at IS NOT NULL) OR (p.phone_verified_at IS NOT NULL)) AS has_verified_factor
     FROM sessions s
     JOIN users u ON u.id = s.user_id AND u.is_active = TRUE
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
     GROUP BY u.id, u.email, u.email_verified_at, p.phone, p.phone_verified_at`,
    [tokenHash],
  );
  const user = result.rows[0];
  if (!user) return null;
  await db.query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [tokenHash]);
  return user;
}
