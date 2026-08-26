import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import type { AppEnv } from '../../config/env.js';
import { db } from '../../db/pool.js';
import { OpenWebUiEdgeClient, OpenWebUiEdgeError } from './openwebui-edge-client.js';

const bodySchema = z.object({
  action: z.enum(['list', 'create', 'update', 'delete', 'sync']),
  entryId: z.string().uuid().optional(),
  cidr: z.string().trim().min(1).max(64).optional(),
  label: z.string().trim().max(160).optional(),
  enabled: z.boolean().optional(),
  confirmation: z.string().max(80).optional(),
});

type AllowlistEntry = {
  id: string;
  cidr: string;
  label: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type SyncState = {
  cloudflare_list_id: string | null;
  cloudflare_ruleset_id: string | null;
  cloudflare_rule_id: string | null;
  desired_revision: number;
  applied_revision: number;
  last_sync_status: 'not_configured' | 'pending' | 'syncing' | 'succeeded' | 'failed';
  last_sync_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  updated_at: string;
};

function isOnlyAdmin(user: { roles: string[] }) {
  return hasRole(user, 'admin');
}

function hashValue(value: string | undefined) {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex');
}

function requestIp(request: FastifyRequest) {
  return request.ip || request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || '';
}

async function audit(
  request: FastifyRequest,
  actorUserId: string,
  action: 'entry_created' | 'entry_updated' | 'entry_deleted' | 'sync_requested' | 'sync_succeeded' | 'sync_failed',
  entryId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.query(
    `INSERT INTO openwebui_edge_audit_events
       (actor_user_id, action, entry_id, request_id, ip_hash, user_agent_hash, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      actorUserId,
      action,
      entryId,
      request.id,
      hashValue(requestIp(request)),
      hashValue(request.headers['user-agent']),
      metadata,
    ],
  );
}

function parseCidr(input: string) {
  const [address = '', rawPrefix, ...extraParts] = input.trim().split('/');
  const family = isIP(address);
  if (!family || extraParts.length > 0) throw new Error('invalid_ip_or_cidr');
  const maximumPrefix = family === 4 ? 32 : 128;
  const minimumPrefix = family === 4 ? 8 : 12;
  const prefix = rawPrefix === undefined ? maximumPrefix : Number(rawPrefix);
  if (!Number.isInteger(prefix) || prefix < minimumPrefix || prefix > maximumPrefix) throw new Error('invalid_cidr_prefix');
  if (isPrivateOrReserved(address, family)) throw new Error('private_or_reserved_address');
  return `${address}/${prefix}`;
}

function isPrivateOrReserved(address: string, family: number) {
  if (family === 4) {
    const [a = -1, b = -1] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === '::' || normalized === '::1'
    || normalized.startsWith('fc') || normalized.startsWith('fd')
    || normalized.startsWith('fe8') || normalized.startsWith('fe9')
    || normalized.startsWith('fea') || normalized.startsWith('feb')
    || normalized.startsWith('ff');
}

async function readEntries() {
  const result = await db.query<AllowlistEntry>(
    `SELECT id, cidr::text, label, enabled, created_at, updated_at
       FROM openwebui_ip_allowlist_entries
      ORDER BY enabled DESC, cidr ASC`,
  );
  return result.rows;
}

async function readState() {
  const result = await db.query<SyncState>(
    `SELECT cloudflare_list_id, cloudflare_ruleset_id, cloudflare_rule_id,
            desired_revision, applied_revision, last_sync_status, last_sync_at,
            last_error_code, last_error_message, updated_at
       FROM openwebui_edge_sync_state
      WHERE singleton = TRUE`,
  );
  return result.rows[0]!;
}

function publicState(state: SyncState, configured: boolean) {
  return {
    edgeConfigured: configured,
    desiredRevision: state.desired_revision,
    appliedRevision: state.applied_revision,
    isInSync: configured && state.desired_revision === state.applied_revision && state.last_sync_status === 'succeeded',
    lastSyncStatus: state.last_sync_status,
    lastSyncAt: state.last_sync_at,
    lastErrorCode: state.last_error_code,
    lastErrorMessage: state.last_error_message,
  };
}

export async function registerOpenWebUiAccessRoutes(app: FastifyInstance, env: AppEnv) {
  const edge = new OpenWebUiEdgeClient(env);

  app.post('/api/v1/admin/openwebui-access', async (request, reply) => {
    const actor = await getAuthUser(request);
    if (!actor || !isOnlyAdmin(actor)) {
      return reply.status(actor ? 403 : 401).send({ error: actor ? 'forbidden' : 'unauthorized' });
    }
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    const body = parsed.data;

    if (body.action === 'list') {
      const [entries, state] = await Promise.all([readEntries(), readState()]);
      return reply.send({ ok: true, entries, sync: publicState(state, edge.isConfigured()) });
    }

    if (body.action === 'create') {
      if (!body.cidr) return reply.status(400).send({ error: 'cidr_required' });
      let cidr: string;
      try { cidr = parseCidr(body.cidr); } catch (error) {
        return reply.status(400).send({ error: error instanceof Error ? error.message : 'invalid_ip_or_cidr' });
      }
      try {
        const result = await db.query<AllowlistEntry>(
          `INSERT INTO openwebui_ip_allowlist_entries (cidr, label, enabled, created_by, updated_by)
           VALUES ($1::cidr,$2,$3,$4,$4)
           RETURNING id, cidr::text, label, enabled, created_at, updated_at`,
          [cidr, body.label ?? '', body.enabled ?? true, actor.id],
        );
        await db.query(`UPDATE openwebui_edge_sync_state SET desired_revision = desired_revision + 1, last_sync_status = 'pending' WHERE singleton = TRUE`);
        await audit(request, actor.id, 'entry_created', result.rows[0]!.id, { cidr, enabled: body.enabled ?? true });
        return reply.status(201).send({ ok: true, entry: result.rows[0] });
      } catch (error) {
        const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
        return reply.status(duplicate ? 409 : 500).send({ error: duplicate ? 'cidr_already_exists' : 'entry_create_failed' });
      }
    }

    if (body.action === 'update') {
      if (!body.entryId) return reply.status(400).send({ error: 'entry_id_required' });
      if (body.cidr === undefined && body.label === undefined && body.enabled === undefined) {
        return reply.status(400).send({ error: 'update_required' });
      }
      let cidr: string | undefined;
      if (body.cidr !== undefined) {
        try { cidr = parseCidr(body.cidr); } catch (error) {
          return reply.status(400).send({ error: error instanceof Error ? error.message : 'invalid_ip_or_cidr' });
        }
      }
      try {
        const result = await db.query<AllowlistEntry>(
          `UPDATE openwebui_ip_allowlist_entries
              SET cidr = COALESCE($1::cidr, cidr), label = COALESCE($2, label), enabled = COALESCE($3, enabled), updated_by = $4
            WHERE id = $5
          RETURNING id, cidr::text, label, enabled, created_at, updated_at`,
          [cidr ?? null, body.label ?? null, body.enabled ?? null, actor.id, body.entryId],
        );
        if (!result.rows[0]) return reply.status(404).send({ error: 'entry_not_found' });
        await db.query(`UPDATE openwebui_edge_sync_state SET desired_revision = desired_revision + 1, last_sync_status = 'pending' WHERE singleton = TRUE`);
        await audit(request, actor.id, 'entry_updated', body.entryId, { changed: Object.keys(body).filter((key) => ['cidr', 'label', 'enabled'].includes(key)) });
        return reply.send({ ok: true, entry: result.rows[0] });
      } catch (error) {
        const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
        return reply.status(duplicate ? 409 : 500).send({ error: duplicate ? 'cidr_already_exists' : 'entry_update_failed' });
      }
    }

    if (body.action === 'delete') {
      if (!body.entryId) return reply.status(400).send({ error: 'entry_id_required' });
      const result = await db.query<AllowlistEntry>(
        `DELETE FROM openwebui_ip_allowlist_entries WHERE id = $1
         RETURNING id, cidr::text, label, enabled, created_at, updated_at`,
        [body.entryId],
      );
      if (!result.rows[0]) return reply.status(404).send({ error: 'entry_not_found' });
      await db.query(`UPDATE openwebui_edge_sync_state SET desired_revision = desired_revision + 1, last_sync_status = 'pending' WHERE singleton = TRUE`);
      await audit(request, actor.id, 'entry_deleted', body.entryId, { cidr: result.rows[0].cidr });
      return reply.send({ ok: true });
    }

    if (body.confirmation !== 'SYNC_OPENWEBUI_ALLOWLIST') {
      return reply.status(400).send({ error: 'sync_confirmation_required' });
    }
    if (!edge.isConfigured()) return reply.status(409).send({ error: 'cloudflare_not_configured' });

    const lockClient = await db.connect();
    try {
      const lock = await lockClient.query<{ locked: boolean }>(`SELECT pg_try_advisory_lock(hashtext('openwebui_edge_allowlist_sync')) AS locked`);
      if (!lock.rows[0]?.locked) return reply.status(409).send({ error: 'sync_in_progress' });
      const [entries, state] = await Promise.all([readEntries(), readState()]);
      const enabledEntries = entries.filter((entry) => entry.enabled).map((entry) => ({ cidr: entry.cidr, label: entry.label }));
      if (enabledEntries.length === 0) return reply.status(400).send({ error: 'enabled_entry_required' });
      await db.query(`UPDATE openwebui_edge_sync_state SET last_sync_status = 'syncing', last_error_code = NULL, last_error_message = NULL WHERE singleton = TRUE`);
      await audit(request, actor.id, 'sync_requested', null, { enabledEntryCount: enabledEntries.length, desiredRevision: state.desired_revision });
      try {
        const synced = await edge.synchronize({
          entries: enabledEntries,
          listId: state.cloudflare_list_id,
          rulesetId: state.cloudflare_ruleset_id,
          ruleId: state.cloudflare_rule_id,
        });
        const updated = await db.query<SyncState>(
          `UPDATE openwebui_edge_sync_state
              SET cloudflare_list_id = $1, cloudflare_ruleset_id = $2, cloudflare_rule_id = $3,
                  applied_revision = desired_revision, last_sync_status = 'succeeded', last_sync_at = now(),
                  last_error_code = NULL, last_error_message = NULL
            WHERE singleton = TRUE
          RETURNING cloudflare_list_id, cloudflare_ruleset_id, cloudflare_rule_id,
                    desired_revision, applied_revision, last_sync_status, last_sync_at,
                    last_error_code, last_error_message, updated_at`,
          [synced.listId, synced.rulesetId, synced.ruleId],
        );
        await audit(request, actor.id, 'sync_succeeded', null, { enabledEntryCount: enabledEntries.length, operationId: synced.operationId });
        return reply.send({ ok: true, sync: publicState(updated.rows[0]!, true) });
      } catch (error) {
        const edgeError = error instanceof OpenWebUiEdgeError
          ? error
          : new OpenWebUiEdgeError('Cloudflare allowlist synchronization failed.', 'cloudflare_sync_failed', true);
        const updated = await db.query<SyncState>(
          `UPDATE openwebui_edge_sync_state
              SET last_sync_status = 'failed', last_sync_at = now(), last_error_code = $1, last_error_message = $2
            WHERE singleton = TRUE
          RETURNING cloudflare_list_id, cloudflare_ruleset_id, cloudflare_rule_id,
                    desired_revision, applied_revision, last_sync_status, last_sync_at,
                    last_error_code, last_error_message, updated_at`,
          [edgeError.code, edgeError.message.slice(0, 500)],
        );
        await audit(request, actor.id, 'sync_failed', null, { code: edgeError.code, retryable: edgeError.retryable });
        return reply.status(edgeError.code === 'cloudflare_not_configured' ? 409 : 502).send({
          error: edgeError.code,
          retryable: edgeError.retryable,
          sync: publicState(updated.rows[0]!, true),
        });
      }
    } finally {
      try { await lockClient.query(`SELECT pg_advisory_unlock(hashtext('openwebui_edge_allowlist_sync'))`); } catch { /* connection release also clears session locks */ }
      lockClient.release();
    }
  });
}
