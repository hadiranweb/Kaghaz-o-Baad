import type { FastifyInstance } from 'fastify';
import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';
import { getAuthUser } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import type { AppEnv } from '../../config/env.js';

const paramsSchema = z.object({ sessionId: z.string().uuid() });

export async function registerLiveRoutes(app: FastifyInstance, env: AppEnv) {
  app.post('/api/v1/live/sessions/:sessionId/token', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
      return reply.status(503).send({ error: 'livekit_not_configured' });
    }
    const result = await db.query<{ id: string; host_id: string | null; title: string; room_name: string; status: string; metadata: Record<string, unknown> }>(
      'SELECT id, host_id, title, room_name, status, metadata FROM live_sessions WHERE id = $1',
      [params.data.sessionId],
    );
    const session = result.rows[0];
    if (!session) return reply.status(404).send({ error: 'session_not_found' });
    if (session.status === 'ended' || session.status === 'cancelled') return reply.status(409).send({ error: 'session_not_active' });
    const isHost = session.host_id === user.id;
    const isSpeaker = isHost || user.roles.some((role) => ['admin', 'editor', 'senior_manager', 'technical_manager'].includes(role));
    const role = isHost ? 'host' : isSpeaker ? 'speaker' : 'viewer';
    const identity = `user:${user.id}`;
    const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { identity, name: user.email, ttl: '1h' });
    accessToken.addGrant({
      roomJoin: true,
      room: session.room_name,
      canPublish: isSpeaker,
      canSubscribe: true,
      canPublishData: true,
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
}
