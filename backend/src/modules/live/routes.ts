import type { FastifyInstance } from 'fastify';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { TrackSource } from '@livekit/protocol';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import type { AppEnv } from '../../config/env.js';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const participantParamsSchema = z.object({ sessionId: z.string().uuid(), identity: z.string().min(1).max(200) });
const roomOptionsSchema = z.object({ maxParticipants: z.number().int().positive().max(10_000).optional() }).default({});
const muteSchema = z.object({ trackSid: z.string().min(1).max(200), muted: z.boolean().default(true) });

const MANAGEMENT_ROLES = ['admin', 'editor', 'senior_manager', 'technical_manager'];

type LiveSession = {
  id: string;
  host_id: string | null;
  title: string;
  room_name: string;
  status: string;
  metadata: Record<string, unknown>;
};

function canManageAll(user: { roles: string[] }) {
  return hasRole(user, ...MANAGEMENT_ROLES);
}

function livekitConfigured(env: AppEnv): env is AppEnv & { LIVEKIT_URL: string; LIVEKIT_API_KEY: string; LIVEKIT_API_SECRET: string } {
  return Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
}

function createRoomService(env: AppEnv) {
  if (!livekitConfigured(env)) return null;
  const host = env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  return new RoomServiceClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

async function getSession(sessionId: string) {
  const result = await db.query<LiveSession>(
    'SELECT id, host_id, title, room_name, status, metadata FROM live_sessions WHERE id = $1',
    [sessionId],
  );
  return result.rows[0] ?? null;
}

function isSessionManager(user: { id: string; roles: string[] }, session: LiveSession) {
  return session.host_id === user.id || canManageAll(user);
}

export async function registerLiveRoutes(app: FastifyInstance, env: AppEnv) {
  // Creates/configures the LiveKit room explicitly. LiveKit can also auto-create
  // a room on first join, but explicit creation lets the product control metadata,
  // capacity and lifecycle from the database.
  app.post('/api/v1/live/sessions/:sessionId/room', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    const body = roomOptionsSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });

    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    if (session.status === 'ended' || session.status === 'cancelled') return reply.status(409).send({ error: 'session_not_active' });

    const service = createRoomService(env)!;
    const room = await service.createRoom({
      name: session.room_name,
      emptyTimeout: 300,
      departureTimeout: 30,
      maxParticipants: body.data.maxParticipants ?? 500,
      metadata: JSON.stringify({ sessionId: session.id, title: session.title, product: 'kaghaz-o-baad' }),
    });

    if (session.status === 'scheduled') {
      await db.query(
        `UPDATE live_sessions SET status = 'live', starts_at = COALESCE(starts_at, now()), updated_at = now() WHERE id = $1`,
        [session.id],
      );
    }
    return reply.status(201).send({ ok: true, room: { name: room.name, sid: room.sid, metadata: room.metadata, max_participants: room.maxParticipants } });
  });

  // Short-lived token with server-enforced role grants.
  app.post('/api/v1/live/sessions/:sessionId/token', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });

    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (session.status === 'ended' || session.status === 'cancelled') return reply.status(409).send({ error: 'session_not_active' });

    const isHost = session.host_id === user.id;
    const isSpeaker = isHost || canManageAll(user);
    const role = isHost ? 'host' : isSpeaker ? 'speaker' : 'viewer';
    const identity = `user:${user.id}`;
    const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity,
      name: user.email,
      ttl: '1h',
      metadata: JSON.stringify({ sessionId: session.id, role }),
    });
    accessToken.addGrant({
      roomJoin: true,
      room: session.room_name,
      canPublish: isSpeaker,
      canPublishSources: isSpeaker ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE] : [],
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomCreate: false,
    });
    const token = await accessToken.toJwt();
    return reply.send({
      ok: true,
      token,
      url: env.LIVEKIT_URL,
      room: session.room_name,
      role,
      identity,
      name: user.email,
      session_status: session.status,
      e2ee_enabled: session.metadata.e2ee_enabled === true,
      article_id: typeof session.metadata.article_id === 'string' ? session.metadata.article_id : null,
      presentation_enabled: session.metadata.presentation_enabled === true,
      presentation_media_id: typeof session.metadata.presentation_media_id === 'string' ? session.metadata.presentation_media_id : null,
      presentation_url: typeof session.metadata.presentation_url === 'string' ? session.metadata.presentation_url : null,
      presentation_name: typeof session.metadata.presentation_name === 'string' ? session.metadata.presentation_name : null,
      presentation_kind: typeof session.metadata.presentation_kind === 'string' ? session.metadata.presentation_kind : null,
    });
  });

  app.get('/api/v1/live/sessions/:sessionId/participants', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    const participants = await createRoomService(env)!.listParticipants(session.room_name);
    return reply.send({ ok: true, participants });
  });

  app.delete('/api/v1/live/sessions/:sessionId/participants/:identity', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = participantParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    if (params.data.identity === `user:${user.id}`) return reply.status(400).send({ error: 'cannot_remove_self' });
    await createRoomService(env)!.removeParticipant(session.room_name, params.data.identity);
    return reply.send({ ok: true });
  });

  app.post('/api/v1/live/sessions/:sessionId/participants/:identity/mute', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = participantParamsSchema.safeParse(request.params);
    const body = muteSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    const track = await createRoomService(env)!.mutePublishedTrack(session.room_name, params.data.identity, body.data.trackSid, body.data.muted);
    return reply.send({ ok: true, track });
  });
}
