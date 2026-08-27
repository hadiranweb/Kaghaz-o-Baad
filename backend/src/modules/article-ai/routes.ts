import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import type { AppEnv } from '../../config/env.js';
import { CASIO_INTEGRATION_KEY, casioFlowCallbackSchema } from '../../integrations/casio-plus/contracts.js';
import { verifyCasioSignature } from '../../integrations/casio-plus/signer.js';
import { db } from '../../db/pool.js';
import {
  applyCasioEditorialCallback,
  ArticleAiError,
  decideArticleAiProposal,
  getArticleAiProposals,
  queueArticleEditorialSuggestion,
} from './service.js';

const articleParamsSchema = z.object({ articleId: z.string().uuid() });
const proposalParamsSchema = z.object({ proposalId: z.string().uuid() });
const proposalDecisionSchema = z.object({
  decision: z.enum(['accepted', 'rejected', 'edited']),
  note: z.string().trim().min(1).max(4_000).optional(),
});

function rawBodyOf(request: { rawBody?: unknown }) {
  return typeof request.rawBody === 'string' ? request.rawBody : null;
}

function isManager(roles: string[]) {
  return hasRole({ roles }, 'admin', 'senior_manager', 'technical_manager');
}

function sendArticleAiError(error: unknown, reply: { status: (statusCode: number) => { send: (payload: unknown) => unknown } }) {
  if (error instanceof ArticleAiError) return reply.status(error.statusCode).send({ error: error.code });
  throw error;
}

export async function registerArticleAiRoutes(app: FastifyInstance, env: AppEnv) {
  app.post('/api/v1/articles/:articleId/ai/editorial-suggestion', async (request, reply) => {
    if (!env.CASIO_PLUS_ENABLED) return reply.status(503).send({ error: 'casio_plus_disabled' });
    const actor = await getAuthUser(request);
    if (!actor) return reply.status(401).send({ error: 'unauthorized' });
    const params = articleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    try {
      const result = await queueArticleEditorialSuggestion({
        articleId: params.data.articleId,
        actor,
        snapshotRetentionDays: env.CASIO_SNAPSHOT_RETENTION_DAYS,
        inlineSnapshotMaxBytes: env.CASIO_INLINE_SNAPSHOT_MAX_BYTES,
      });
      return reply.status(result.idempotent ? 200 : 202).send({
        ok: true,
        invocation: {
          id: result.invocation.id,
          state: result.invocation.state,
          requestId: result.invocation.request_id,
          idempotencyKey: result.invocation.idempotency_key,
          flowKey: result.invocation.flow_key,
        },
        snapshot: {
          id: result.snapshot.id,
          contentRevision: result.snapshot.content_revision,
        },
        idempotent: result.idempotent,
      });
    } catch (error) {
      return sendArticleAiError(error, reply);
    }
  });

  app.get('/api/v1/articles/:articleId/ai/proposals', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor) return reply.status(401).send({ error: 'unauthorized' });
    const params = articleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    try {
      return reply.send({ ok: true, ...(await getArticleAiProposals({ articleId: params.data.articleId, actor })) });
    } catch (error) {
      return sendArticleAiError(error, reply);
    }
  });

  app.post('/api/v1/article-ai/proposals/:proposalId/decision', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor) return reply.status(401).send({ error: 'unauthorized' });
    const params = proposalParamsSchema.safeParse(request.params);
    const body = proposalDecisionSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    try {
      const proposal = await decideArticleAiProposal({
        proposalId: params.data.proposalId,
        actor,
        decision: body.data.decision,
        note: body.data.note,
      });
      return reply.send({ ok: true, proposal });
    } catch (error) {
      return sendArticleAiError(error, reply);
    }
  });

  app.post('/api/v1/integrations/casio/callback', async (request, reply) => {
    if (!env.CASIO_PLUS_ENABLED || !env.CASIO_TO_KAGHAZBAAD_HMAC_SECRET) {
      return reply.status(503).send({ error: 'casio_plus_disabled' });
    }
    const rawBody = rawBodyOf(request as unknown as { rawBody?: unknown });
    const integration = request.headers['x-casio-integration'];
    const keyId = request.headers['x-casio-key-id'];
    const timestamp = request.headers['x-casio-timestamp'];
    const nonce = request.headers['x-casio-nonce'];
    const signature = request.headers['x-casio-signature'];
    const callbackSecret = keyId === env.CASIO_PLUS_SIGNING_KEY_ID
      ? env.CASIO_TO_KAGHAZBAAD_HMAC_SECRET
      : keyId === env.CASIO_PLUS_PREVIOUS_SIGNING_KEY_ID
        ? env.CASIO_TO_KAGHAZBAAD_PREVIOUS_HMAC_SECRET
        : undefined;
    if (
      !rawBody
      || integration !== CASIO_INTEGRATION_KEY
      || !callbackSecret
      || typeof keyId !== 'string'
      || typeof timestamp !== 'string'
      || typeof nonce !== 'string'
      || typeof signature !== 'string'
    ) {
      return reply.status(401).send({ error: 'invalid_casio_callback_signature' });
    }
    const signatureValid = verifyCasioSignature({
      secret: callbackSecret,
      keyId,
      timestamp,
      nonce,
      rawBody,
      receivedSignature: signature,
    });
    if (!signatureValid) return reply.status(401).send({ error: 'invalid_casio_callback_signature' });

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody);
    } catch {
      return reply.status(400).send({ error: 'invalid_casio_callback_payload' });
    }
    const callback = casioFlowCallbackSchema.safeParse(decoded);
    if (!callback.success) return reply.status(422).send({ error: 'invalid_casio_callback_payload' });
    try {
      const result = await applyCasioEditorialCallback({ callback: callback.data, nonce });
      return reply.status(result.idempotent ? 200 : 202).send({ ok: true, ...result });
    } catch (error) {
      return sendArticleAiError(error, reply);
    }
  });

  app.get('/api/v1/admin/integrations/casio/status', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor) return reply.status(401).send({ error: 'unauthorized' });
    if (!isManager(actor.roles)) return reply.status(403).send({ error: 'forbidden' });
    const result = await db.query<{
      pending: string;
      leased: string;
      delivered: string;
      dead_letter: string;
      oldest_pending_at: string | null;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'leased') AS leased,
         COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
         COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter,
         MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending_at
       FROM integration_outbox
       WHERE destination = 'casioplus'`,
    );
    const status = result.rows[0] ?? { pending: '0', leased: '0', delivered: '0', dead_letter: '0', oldest_pending_at: null };
    return reply.send({
      ok: true,
      enabled: env.CASIO_PLUS_ENABLED,
      workerEnabled: env.CASIO_OUTBOX_WORKER_ENABLED,
      outbox: {
        pending: Number(status.pending),
        leased: Number(status.leased),
        delivered: Number(status.delivered),
        deadLetter: Number(status.dead_letter),
        oldestPendingAt: status.oldest_pending_at,
      },
    });
  });
}
