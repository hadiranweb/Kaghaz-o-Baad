import type { FastifyInstance } from 'fastify';
import { AccessToken, EgressClient, RoomServiceClient, WebhookReceiver, type WebhookEvent } from 'livekit-server-sdk';
import { EncodedFileOutput, EncodedFileType, S3Upload } from '@livekit/protocol';
import { TrackSource } from '@livekit/protocol';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import { commitQuota, getQuotaStatus, reserveQuota } from '../quota/service.js';
import type { AppEnv } from '../../config/env.js';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const participantParamsSchema = z.object({ sessionId: z.string().uuid(), identity: z.string().min(1).max(200) });
const roomOptionsSchema = z.object({ maxParticipants: z.number().int().positive().max(10_000).optional() }).default({});
const muteSchema = z.object({ trackSid: z.string().min(1).max(200), muted: z.boolean().default(true) });
const roleParamsSchema = z.object({ sessionId: z.string().uuid(), userId: z.string().uuid() });
const roleBodySchema = z.object({ role: z.enum(['speaker', 'viewer']) });
const recordingBodySchema = z.object({ outputType: z.enum(['mp4', 'audio']).default('mp4') });
const interactionSchema = z.object({
  type: z.enum(['chat', 'question', 'reaction', 'hand_raise']),
  payload: z.record(z.string(), z.unknown()).default({}),
});

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

function createEgressService(env: AppEnv) {
  if (!livekitConfigured(env)) return null;
  const host = env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  return new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

function storageConfigured(env: AppEnv): env is AppEnv & { S3_ENDPOINT: string; S3_BUCKET: string; S3_ACCESS_KEY_ID: string; S3_SECRET_ACCESS_KEY: string } {
  return Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
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

function userIdFromIdentity(identity: unknown) {
  if (typeof identity !== 'string' || !identity.startsWith('user:')) return null;
  const value = identity.slice('user:'.length);
  return z.string().uuid().safeParse(value).success ? value : null;
}

function rawBodyOf(request: { rawBody?: unknown }) {
  return typeof request.rawBody === 'string' ? request.rawBody : null;
}

export async function registerLiveRoutes(app: FastifyInstance, env: AppEnv) {
  app.post('/api/v1/live/sessions/:sessionId/recordings', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    const body = recordingBodySchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    if (!storageConfigured(env)) return reply.status(503).send({ error: 'object_storage_not_configured' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    if (session.status !== 'live') return reply.status(409).send({ error: 'session_not_live' });
    const active = await db.query('SELECT id FROM live_recordings WHERE session_id = $1 AND status IN (\'starting\', \'active\') LIMIT 1', [session.id]);
    if (active.rows[0]) return reply.status(409).send({ error: 'recording_already_active' });

    const outputType = body.data.outputType;
    const objectKey = `live-recordings/${session.id}/{time}.${outputType === 'audio' ? 'mp3' : 'mp4'}`;
    const fileOutput = new EncodedFileOutput({
      fileType: outputType === 'audio' ? EncodedFileType.MP3 : EncodedFileType.MP4,
      filepath: objectKey,
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey: env.S3_ACCESS_KEY_ID,
          secret: env.S3_SECRET_ACCESS_KEY,
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          bucket: env.S3_BUCKET,
          forcePathStyle: true,
          contentDisposition: 'attachment',
          metadata: { session_id: session.id, product: 'kaghaz-o-baad' },
        }),
      },
    });
    try {
      const info = await createEgressService(env)!.startRoomCompositeEgress(session.room_name, fileOutput, {
        layout: 'speaker',
        audioOnly: outputType === 'audio',
      });
      const result = await db.query(
        `INSERT INTO live_recordings (session_id, egress_id, output_type, status, object_key, started_at, created_by, metadata)
         VALUES ($1, $2, $3, 'starting', $4, now(), $5, $6)
         RETURNING id, session_id, egress_id, output_type, status, object_key, started_at, created_at`,
        [session.id, info.egressId, outputType, objectKey, user.id, { roomName: session.room_name, egressStatus: info.status }],
      );
      return reply.status(201).send({ ok: true, recording: result.rows[0] });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({ error: 'egress_start_failed' });
    }
  });

  app.post('/api/v1/live/sessions/:sessionId/recordings/:egressId/stop', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ sessionId: z.string().uuid(), egressId: z.string().min(1).max(100) }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    try {
      const info = await createEgressService(env)!.stopEgress(params.data.egressId);
      await db.query(`UPDATE live_recordings SET status = 'stopped', ended_at = COALESCE(ended_at, now()), updated_at = now(), metadata = metadata || $2 WHERE session_id = $1 AND egress_id = $3`, [session.id, { egressStatus: info.status }, params.data.egressId]);
      return reply.send({ ok: true, status: info.status });
    } catch (error) {
      request.log.error(error);
      return reply.status(502).send({ error: 'egress_stop_failed' });
    }
  });

  app.get('/api/v1/live/sessions/:sessionId/recordings', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    const access = await db.query(
      `SELECT 1 FROM live_session_participants WHERE session_id = $1 AND user_id = $2
       UNION ALL SELECT 1 WHERE $2 = $3 OR $4 = TRUE LIMIT 1`,
      [session.id, user.id, session.host_id, canManageAll(user)],
    );
    if (!access.rows[0]) return reply.status(403).send({ error: 'forbidden' });
    const result = await db.query(
      `SELECT id, session_id, egress_id, output_type, status, object_key, object_url,
              duration_seconds, file_size_bytes, mime_type, started_at, ended_at, created_by, created_at, updated_at
       FROM live_recordings WHERE session_id = $1 ORDER BY created_at DESC`,
      [session.id],
    );
    return reply.send({ ok: true, recordings: result.rows });
  });

  // LiveKit signs webhook requests with the API secret. The raw request body is
  // verified before any event is persisted, making retries idempotent by event id.
  app.post('/api/v1/live/webhooks/livekit', async (request, reply) => {
    if (!livekitConfigured(env)) return reply.status(503).send({ error: 'livekit_not_configured' });
    const rawBody = rawBodyOf(request as unknown as { rawBody?: unknown });
    const authHeader = request.headers.authorization ?? request.headers.authorize;
    if (!rawBody || typeof authHeader !== 'string') return reply.status(400).send({ error: 'invalid_webhook' });
    let event: WebhookEvent;
    try {
      event = await new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).receive(rawBody, authHeader);
    } catch {
      return reply.status(401).send({ error: 'invalid_webhook_signature' });
    }

    const eventId = typeof event.id === 'string' && event.id ? event.id : `${event.event}:${event.room?.name ?? 'unknown'}:${event.participant?.identity ?? 'unknown'}:${event.createdAt ?? Date.now()}`;
    const roomName = typeof event.room?.name === 'string' ? event.room.name : null;
    const sessionResult = roomName ? await db.query<{ id: string }>('SELECT id FROM live_sessions WHERE room_name = $1', [roomName]) : { rows: [] };
    const sessionId = sessionResult.rows[0]?.id ?? null;
    const participantIdentity = typeof event.participant?.identity === 'string' ? event.participant.identity : null;
    const userId = userIdFromIdentity(participantIdentity);
    const inserted = await db.query(
      `INSERT INTO live_session_events (event_id, session_id, user_id, event_type, participant_identity, payload, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE(to_timestamp($7 / 1000.0), now()))
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [eventId, sessionId, userId, event.event, participantIdentity, event, Number(event.createdAt ?? Date.now())],
    );

    if (inserted.rowCount && sessionId && participantIdentity) {
      if (event.event === 'participant_joined') {
        await db.query(
          `INSERT INTO live_session_presence (session_id, user_id, participant_identity, joined_at, join_event_id)
           VALUES ($1, $2, $3, COALESCE(to_timestamp($4 / 1000.0), now()), $5)
           ON CONFLICT (join_event_id) DO NOTHING`,
          [sessionId, userId, participantIdentity, Number(event.createdAt ?? Date.now()), eventId],
        );
      } else if (event.event === 'participant_left' || event.event === 'participant_connection_aborted') {
        const presence = await db.query<{ user_id: string | null; duration_seconds: string }>(
          `UPDATE live_session_presence
           SET left_at = COALESCE(left_at, COALESCE(to_timestamp($2 / 1000.0), now())),
               duration_seconds = EXTRACT(EPOCH FROM (COALESCE(left_at, COALESCE(to_timestamp($2 / 1000.0), now())) - joined_at)),
               leave_event_id = COALESCE(leave_event_id, $3),
               updated_at = now()
           WHERE session_id = $1 AND participant_identity = $4 AND left_at IS NULL
           RETURNING user_id, duration_seconds`,
          [sessionId, Number(event.createdAt ?? Date.now()), eventId, participantIdentity],
        );
        const presenceRow = presence.rows[0];
        if (presenceRow?.user_id) {
          const minutes = Math.max(1, Math.ceil(Number(presenceRow.duration_seconds) / 60));
          try {
            const reservation = await reserveQuota({ userId: presenceRow.user_id, requestId: `live:${eventId}`, featureKey: 'live.minutes', units: minutes });
            await commitQuota(reservation, minutes);
          } catch {
            // Presence is retained even when the plan has no live quota or is exhausted.
            // The token endpoint prevents new non-manager joins once remaining is zero.
          }
        }
      }
    }
    if (inserted.rowCount && sessionId && event.event === 'room_finished') {
      await db.query(`UPDATE live_sessions SET status = CASE WHEN status = 'cancelled' THEN status ELSE 'ended' END, ends_at = COALESCE(ends_at, now()), updated_at = now() WHERE id = $1`, [sessionId]);
    }

    const egress = event.egressInfo;
    const egressId = typeof egress?.egressId === 'string' ? egress.egressId : null;
    if (inserted.rowCount && egress && egressId) {
      const egressStatus = event.event === 'egress_started' ? 'active' : event.event === 'egress_ended' ? (egress.error ? 'failed' : 'completed') : 'active';
      const fileInfo = Array.isArray(egress.fileResults) ? egress.fileResults[0] : null;
      const duration = Number(fileInfo?.duration ?? egress.endedAt ?? 0);
      const size = Number(fileInfo?.size ?? 0);
      await db.query(
        `UPDATE live_recordings
         SET status = $2,
             ended_at = CASE WHEN $2 IN ('completed', 'failed', 'stopped') THEN COALESCE(ended_at, now()) ELSE ended_at END,
             duration_seconds = CASE WHEN $3 > 0 THEN $3 ELSE duration_seconds END,
             file_size_bytes = CASE WHEN $4 > 0 THEN $4 ELSE file_size_bytes END,
             mime_type = COALESCE($5, mime_type),
             object_url = COALESCE($6, object_url),
             error_code = COALESCE($7, error_code),
             metadata = metadata || $8,
             updated_at = now()
         WHERE egress_id = $1`,
        [egressId, egressStatus, duration, size, null, fileInfo?.location ?? null, egress.error || null, egress],
      );
    }
    return reply.send({ ok: true, duplicate: !inserted.rowCount });
  });

  app.post('/api/v1/live/sessions/:sessionId/interactions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    const body = interactionSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!['live', 'scheduled'].includes(session.status)) return reply.status(409).send({ error: 'session_not_active' });
    const result = await db.query(
      `INSERT INTO live_session_interactions (session_id, user_id, interaction_type, payload)
       VALUES ($1, $2, $3, $4) RETURNING id, session_id, user_id, interaction_type, payload, created_at`,
      [session.id, user.id, body.data.type, body.data.payload],
    );
    await db.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'live_session', $3, $4)`,
      [user.id, `live.${body.data.type}`, session.id, body.data.payload],
    );
    return reply.status(201).send({ ok: true, interaction: result.rows[0] });
  });

  app.get('/api/v1/live/sessions/:sessionId/interactions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    const result = await db.query(
      `SELECT i.id, i.session_id, i.user_id, i.interaction_type, i.payload, i.created_at,
              u.email, p.first_name, p.last_name
       FROM live_session_interactions i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN profiles p ON p.user_id = i.user_id
       WHERE i.session_id = $1 ORDER BY i.created_at DESC LIMIT 100`,
      [session.id],
    );
    return reply.send({ ok: true, interactions: result.rows.reverse() });
  });

  // Returns the session-scoped role assignments. The host is represented by
  // live_sessions.host_id; this endpoint returns it together with assignments.
  app.get('/api/v1/live/sessions/:sessionId/roles', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    const result = await db.query(
      `SELECT lsp.session_id, lsp.user_id, lsp.role, lsp.granted_by, lsp.created_at, lsp.updated_at,
              u.email, p.first_name, p.last_name, p.avatar_url
       FROM live_session_participants lsp
       JOIN users u ON u.id = lsp.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE lsp.session_id = $1
       ORDER BY lsp.role ASC, lsp.created_at ASC`,
      [session.id],
    );
    return reply.send({
      ok: true,
      host: session.host_id ? { user_id: session.host_id, role: 'host' } : null,
      participants: result.rows,
    });
  });

  // Host or platform manager assigns a speaker or resets a user to viewer.
  app.put('/api/v1/live/sessions/:sessionId/roles/:userId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = roleParamsSchema.safeParse(request.params);
    const body = roleBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    if (params.data.userId === session.host_id) return reply.status(409).send({ error: 'host_role_is_implicit' });
    const target = await db.query<{ id: string }>('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [params.data.userId]);
    if (!target.rows[0]) return reply.status(404).send({ error: 'user_not_found' });
    const result = await db.query(
      `INSERT INTO live_session_participants (session_id, user_id, role, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, updated_at = now()
       RETURNING session_id, user_id, role, granted_by, created_at, updated_at`,
      [session.id, params.data.userId, body.data.role, user.id],
    );
    return reply.send({ ok: true, assignment: result.rows[0] });
  });

  app.delete('/api/v1/live/sessions/:sessionId/roles/:userId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = roleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const session = await getSession(params.data.sessionId);
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (!isSessionManager(user, session)) return reply.status(403).send({ error: 'forbidden' });
    await db.query('DELETE FROM live_session_participants WHERE session_id = $1 AND user_id = $2', [session.id, params.data.userId]);
    return reply.send({ ok: true, role: 'viewer' });
  });

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

    if (!canManageAll(user)) {
      const quota = await getQuotaStatus(user.id, 'live.minutes');
      if (quota.configured && quota.remaining <= 0) return reply.status(429).send({ error: 'live_quota_exceeded', quota });
    }

    const assignment = await db.query<{ role: 'speaker' | 'viewer' }>(
      'SELECT role FROM live_session_participants WHERE session_id = $1 AND user_id = $2',
      [session.id, user.id],
    );
    const isHost = session.host_id === user.id;
    const assignedRole = assignment.rows[0]?.role ?? 'viewer';
    const isSpeaker = isHost || assignedRole === 'speaker';
    const role = isHost ? 'host' : assignedRole;
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
