import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { AppEnv } from '../config/env.js';
import { db } from '../db/pool.js';
import { createSession } from './service.js';
import { recordAuthEvent } from './audit.js';

const providerSchema = z.enum(['google', 'github']);
type Provider = z.infer<typeof providerSchema>;

function redirectUri(env: AppEnv, provider: Provider) {
  return provider === 'google'
    ? env.GOOGLE_OAUTH_REDIRECT_URI ?? `${env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/v1/auth/oauth/google/callback`
    : env.GITHUB_OAUTH_REDIRECT_URI ?? `${env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/v1/auth/oauth/github/callback`;
}

function configured(env: AppEnv, provider: Provider) {
  return provider === 'google'
    ? Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET)
    : Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET);
}

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function safeNext(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}
function requestIp(request: FastifyRequest) { return request.ip || 'unknown'; }

async function createTicket(userId: string) {
  const raw = randomBytes(32).toString('base64url');
  await db.query(`INSERT INTO oauth_login_tickets (ticket_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '90 seconds')`, [hash(raw), userId]);
  return raw;
}

async function findOrCreateUser(provider: Provider, profile: { id: string; email: string | null; name: string | null; avatar: string | null; raw: Record<string, unknown> }) {
  const existingIdentity = await db.query<{ user_id: string }>(`SELECT user_id FROM oauth_identities WHERE provider = $1 AND provider_user_id = $2`, [provider, profile.id]);
  if (existingIdentity.rows[0]) return existingIdentity.rows[0].user_id;
  const email = profile.email?.trim().toLowerCase() || `${provider}_${profile.id}@oauth.kaghazbaad.local`;
  const existingUser = profile.email ? await db.query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`, [email]) : { rows: [] as { id: string }[] };
  let userId = existingUser.rows[0]?.id;
  if (!userId) {
    const created = await db.query<{ id: string }>(`INSERT INTO users (email, password_hash, first_name, email_verified_at) VALUES ($1, $2, $3, CASE WHEN $4 THEN now() ELSE NULL END) RETURNING id`, [email, hash(randomBytes(32).toString('base64url')), profile.name, Boolean(profile.email)]);
    userId = created.rows[0]?.id;
    if (!userId) throw new Error('oauth_user_creation_failed');
    await db.query(`INSERT INTO user_roles (user_id, role) VALUES ($1, 'author') ON CONFLICT DO NOTHING`, [userId]);
  }
  await db.query(
    `INSERT INTO oauth_identities (user_id, provider, provider_user_id, provider_email, display_name, avatar_url, profile)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET provider_email = EXCLUDED.provider_email, display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url, profile = EXCLUDED.profile, updated_at = now()`,
    [userId, provider, profile.id, profile.email, profile.name, profile.avatar, profile.raw],
  );
  return userId;
}

async function exchangeGitHub(code: string, env: AppEnv) {
  const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_OAUTH_CLIENT_ID, client_secret: env.GITHUB_OAUTH_CLIENT_SECRET, code }) });
  if (!response.ok) throw new Error('github_token_exchange_failed');
  const token = await response.json() as { access_token?: string };
  if (!token.access_token) throw new Error('github_missing_access_token');
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Kaghaz-o-Baad' };
  const userResponse = await fetch('https://api.github.com/user', { headers });
  if (!userResponse.ok) throw new Error('github_user_fetch_failed');
  const user = await userResponse.json() as { id: number; name?: string; login?: string; avatar_url?: string; email?: string };
  let email = user.email ?? null;
  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', { headers });
    if (emailResponse.ok) {
      const emails = await emailResponse.json() as Array<{ email: string; primary?: boolean; verified?: boolean }>;
      email = emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email ?? null;
    }
  }
  return { id: String(user.id), email, name: user.name ?? user.login ?? null, avatar: user.avatar_url ?? null, raw: user as Record<string, unknown> };
}

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

async function exchangeGoogle(code: string, env: AppEnv, expectedNonce: string | null) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? '', client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? '', redirect_uri: redirectUri(env, 'google'), grant_type: 'authorization_code' }) });
  if (!response.ok) throw new Error('google_token_exchange_failed');
  const tokens = await response.json() as { id_token?: string };
  if (!tokens.id_token) throw new Error('google_missing_id_token');
  const verified = await jwtVerify(tokens.id_token, googleKeys, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: env.GOOGLE_OAUTH_CLIENT_ID });
  const claims = verified.payload;
  if (!claims.sub || (expectedNonce && claims.nonce !== expectedNonce)) throw new Error('google_invalid_nonce');
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null, name: typeof claims.name === 'string' ? claims.name : null, avatar: typeof claims.picture === 'string' ? claims.picture : null, raw: claims as Record<string, unknown> };
}

export async function registerOAuthRoutes(app: FastifyInstance, env: AppEnv) {
  app.get('/api/v1/auth/oauth/:provider/start', async (request, reply) => {
    const parsed = providerSchema.safeParse((request.params as { provider?: string }).provider);
    if (!parsed.success || !configured(env, parsed.data)) return reply.status(503).send({ error: 'oauth_provider_not_configured' });
    const provider = parsed.data;
    const state = randomBytes(32).toString('base64url');
    const nonce = provider === 'google' ? randomBytes(32).toString('base64url') : null;
    const next = safeNext((request.query as { next?: string }).next);
    await db.query(`INSERT INTO oauth_states (state, provider, nonce, redirect_after, expires_at) VALUES ($1,$2,$3,$4,now()+interval '10 minutes')`, [state, provider, nonce, next]);
    const url = provider === 'google' ? new URL('https://accounts.google.com/o/oauth2/v2/auth') : new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', provider === 'google' ? env.GOOGLE_OAUTH_CLIENT_ID! : env.GITHUB_OAUTH_CLIENT_ID!);
    url.searchParams.set('redirect_uri', redirectUri(env, provider));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    if (provider === 'google') { url.searchParams.set('scope', 'openid email profile'); url.searchParams.set('nonce', nonce!); }
    else { url.searchParams.set('scope', 'read:user user:email'); }
    return reply.redirect(url.toString());
  });

  app.get('/api/v1/auth/oauth/:provider/callback', async (request, reply) => {
    const startedAt = Date.now();
    const providerParsed = providerSchema.safeParse((request.params as { provider?: string }).provider);
    const query = request.query as { code?: string; state?: string; error?: string };
    if (!providerParsed.success || !query.state || !query.code || query.error) return reply.redirect(`${env.FRONTEND_URL}/auth?oauth_error=invalid_callback`);
    const provider = providerParsed.data;
    const stateResult = await db.query<{ provider: Provider; nonce: string | null; redirect_after: string }>(`DELETE FROM oauth_states WHERE state = $1 AND expires_at > now() RETURNING provider, nonce, redirect_after`, [query.state]);
    const state = stateResult.rows[0];
    if (!state || state.provider !== provider) return reply.redirect(`${env.FRONTEND_URL}/auth?oauth_error=invalid_state`);
    try {
      const profile = provider === 'google' ? await exchangeGoogle(query.code, env, state.nonce) : await exchangeGitHub(query.code, env);
      const userId = await findOrCreateUser(provider, profile);
      const ticket = await createTicket(userId);
      await recordAuthEvent({ request, eventType: 'oauth_login', outcome: 'success', provider, userId, email: profile.email, startedAt, metadata: { provider_user_id: profile.id } });
      const url = new URL(`${env.FRONTEND_URL.replace(/\/$/, '')}/auth`);
      url.searchParams.set('oauth_ticket', ticket);
      url.searchParams.set('next', state.redirect_after || '/dashboard');
      return reply.redirect(url.toString());
    } catch (error) {
      request.log.error(error);
      await recordAuthEvent({ request, eventType: 'oauth_login', outcome: 'failure', provider, errorCode: error instanceof Error ? error.message : 'oauth_failed', startedAt });
      return reply.redirect(`${env.FRONTEND_URL}/auth?oauth_error=oauth_failed`);
    }
  });

  app.post('/api/v1/auth/oauth/exchange', async (request, reply) => {
    const ticket = z.object({ ticket: z.string().min(20).max(200) }).safeParse(request.body);
    if (!ticket.success) return reply.status(400).send({ error: 'invalid_ticket' });
    const result = await db.query<{ user_id: string }>(`UPDATE oauth_login_tickets SET consumed_at = now() WHERE ticket_hash = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING user_id`, [hash(ticket.data.ticket)]);
    const userId = result.rows[0]?.user_id;
    if (!userId) return reply.status(401).send({ error: 'invalid_or_expired_ticket' });
    const token = await createSession(userId);
    await recordAuthEvent({ request, eventType: 'oauth_ticket_exchange', outcome: 'success', userId });
    return reply.send({ token });
  });
}
