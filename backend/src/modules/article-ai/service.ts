import type { PoolClient } from 'pg';
import { db } from '../../db/pool.js';
import type { AuthUser } from '../../auth/service.js';
import {
  CASIO_EDITORIAL_FLOW_KEY,
  CASIO_FLOW_INVOKE_CONTRACT,
  casioInvocationIdempotencyKey,
  type CasioFlowCallback,
} from '../../integrations/casio-plus/contracts.js';
import { createCasioInvocationAndOutbox, type CasioFlowInvocation } from '../../integrations/casio-plus/outbox-repository.js';
import {
  createOrReuseArticleSnapshot,
  lockArticleForSnapshot,
  type ArticleContentSnapshot,
} from './snapshot-service.js';

const EDITORIAL_REQUEST_ROLES = ['editor', 'admin', 'senior_manager', 'technical_manager'];
const EDITORIAL_REQUEST_STATUSES = ['draft', 'in_review', 'changes_requested', 'approved', 'scheduled'];

type ArticleAccess = {
  id: string;
  author_id: string | null;
  content_revision: number;
  status: string;
};

export class ArticleAiError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(code);
    this.name = 'ArticleAiError';
  }
}

function canRequestEditorialSuggestion(actor: AuthUser): boolean {
  return EDITORIAL_REQUEST_ROLES.some((role) => actor.roles.includes(role));
}

function canReadArticleAi(actor: AuthUser, article: { author_id: string | null }): boolean {
  return article.author_id === actor.id || canRequestEditorialSuggestion(actor);
}

function isEligibleForEditorialSuggestion(status: string): boolean {
  return EDITORIAL_REQUEST_STATUSES.includes(status);
}

function snapshotExpiration(retentionDays: number): Date {
  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
}

export async function queueArticleEditorialSuggestion(input: {
  articleId: string;
  actor: AuthUser;
  snapshotRetentionDays: number;
  inlineSnapshotMaxBytes: number;
}): Promise<{
  invocation: CasioFlowInvocation;
  snapshot: Pick<ArticleContentSnapshot, 'id' | 'content_revision' | 'content_sha256' | 'byte_size'>;
  idempotent: boolean;
}> {
  if (!canRequestEditorialSuggestion(input.actor)) {
    throw new ArticleAiError('forbidden', 403);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const article = await lockArticleForSnapshot(client, input.articleId);
    if (!article) throw new ArticleAiError('article_not_found', 404);
    if (!isEligibleForEditorialSuggestion(article.status)) {
      throw new ArticleAiError('article_not_eligible_for_editorial_suggestion', 409);
    }
    if (!article.content_fa.trim() && !article.content_en.trim()) {
      throw new ArticleAiError('article_content_missing_for_editorial_suggestion', 422);
    }

    const snapshot = await createOrReuseArticleSnapshot(client, article, input.actor.id);
    if (snapshot.byte_size > input.inlineSnapshotMaxBytes) {
      throw new ArticleAiError('article_snapshot_too_large', 422);
    }

    const idempotencyKey = casioInvocationIdempotencyKey(article.id, snapshot.content_revision);
    const requestId = crypto.randomUUID();
    const created = await createCasioInvocationAndOutbox({
      client,
      articleId: article.id,
      snapshot,
      requestedByUserId: input.actor.id,
      actorId: input.actor.id,
      actorRoles: input.actor.roles,
      requestId,
      idempotencyKey,
      flowKey: CASIO_EDITORIAL_FLOW_KEY,
      contractVersion: CASIO_FLOW_INVOKE_CONTRACT,
    });

    if (!created.idempotent) {
      await client.query(
        `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, request_id, metadata)
         VALUES ($1, 'article.ai.editorial_suggestion.queued', 'article', $2, $3, $4)`,
        [
          input.actor.id,
          article.id,
          created.invocation.request_id,
          {
            flowKey: CASIO_EDITORIAL_FLOW_KEY,
            snapshotId: snapshot.id,
            contentRevision: snapshot.content_revision,
          },
        ],
      );
    }

    await client.query('COMMIT');
    return {
      invocation: created.invocation,
      snapshot: {
        id: snapshot.id,
        content_revision: snapshot.content_revision,
        content_sha256: snapshot.content_sha256,
        byte_size: snapshot.byte_size,
      },
      idempotent: created.idempotent,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getArticleAiProposals(input: { articleId: string; actor: AuthUser }) {
  const articleResult = await db.query<ArticleAccess>(
    'SELECT id, author_id, content_revision, status FROM articles WHERE id = $1',
    [input.articleId],
  );
  const article = articleResult.rows[0];
  if (!article) throw new ArticleAiError('article_not_found', 404);
  if (!canReadArticleAi(input.actor, article)) throw new ArticleAiError('forbidden', 403);

  const proposals = await db.query(
    `SELECT p.id, p.article_id, p.snapshot_id, p.invocation_id, p.suggestion_index, p.proposal_type,
            p.anchor, p.original_text, p.suggested_text, p.reason, p.confidence, p.state,
            p.flow_key, p.flow_version, p.casio_run_id, p.artifact_refs, p.memory_refs,
            p.provenance, p.decided_by_user_id, p.decided_at, p.decision_note, p.created_at, p.updated_at,
            s.content_revision AS snapshot_content_revision
       FROM article_ai_proposals p
       JOIN article_content_snapshots s ON s.id = p.snapshot_id
      WHERE p.article_id = $1
      ORDER BY p.created_at DESC, p.suggestion_index ASC`,
    [input.articleId],
  );
  return {
    article: {
      id: article.id,
      contentRevision: article.content_revision,
      status: article.status,
    },
    proposals: proposals.rows,
  };
}

export async function decideArticleAiProposal(input: {
  proposalId: string;
  actor: AuthUser;
  decision: 'accepted' | 'rejected' | 'edited';
  note?: string;
}) {
  if (!canRequestEditorialSuggestion(input.actor)) throw new ArticleAiError('forbidden', 403);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const proposalResult = await client.query<{
      id: string;
      article_id: string;
      state: string;
      snapshot_content_revision: number;
      current_content_revision: number;
    }>(
      `SELECT p.id, p.article_id, p.state, s.content_revision AS snapshot_content_revision,
              a.content_revision AS current_content_revision
         FROM article_ai_proposals p
         JOIN article_content_snapshots s ON s.id = p.snapshot_id
         JOIN articles a ON a.id = p.article_id
        WHERE p.id = $1
        FOR UPDATE`,
      [input.proposalId],
    );
    const proposal = proposalResult.rows[0];
    if (!proposal) throw new ArticleAiError('article_ai_proposal_not_found', 404);
    if (proposal.state !== 'pending_review') throw new ArticleAiError('article_ai_proposal_not_pending_review', 409);
    if (proposal.snapshot_content_revision !== proposal.current_content_revision) {
      throw new ArticleAiError('article_ai_proposal_stale', 409);
    }

    const updated = await client.query(
      `UPDATE article_ai_proposals
          SET state = $1, decided_by_user_id = $2, decided_at = now(), decision_note = $3, updated_at = now()
        WHERE id = $4
        RETURNING *`,
      [input.decision, input.actor.id, input.note ?? null, proposal.id],
    );
    await client.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'article', $3, $4)`,
      [
        input.actor.id,
        `article.ai.proposal.${input.decision}`,
        proposal.article_id,
        { proposalId: proposal.id },
      ],
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function applyCasioEditorialCallback(input: {
  callback: CasioFlowCallback;
  nonce: string;
}): Promise<{ idempotent: boolean; state: CasioFlowInvocation['state']; proposalsCreated: number }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const duplicateEvent = await client.query(
      `SELECT id FROM casio_callback_receipts WHERE callback_event_id = $1`,
      [input.callback.eventId],
    );
    if (duplicateEvent.rowCount) {
      await client.query('COMMIT');
      return { idempotent: true, state: 'completed', proposalsCreated: 0 };
    }

    const source = input.callback.sourceEntity;
    const invocationResult = await client.query<{
      id: string;
      article_id: string;
      snapshot_id: string;
      casio_run_id: string | null;
      requested_by_user_id: string | null;
      current_content_revision: number;
      snapshot_content_revision: number;
      content_sha256: string;
    }>(
      `SELECT i.id, i.article_id, i.snapshot_id, i.casio_run_id, i.requested_by_user_id,
              a.content_revision AS current_content_revision,
              s.content_revision AS snapshot_content_revision, s.content_sha256
         FROM casio_flow_invocations i
         JOIN articles a ON a.id = i.article_id
         JOIN article_content_snapshots s ON s.id = i.snapshot_id
        WHERE i.request_id = $1
          AND i.article_id = $2
          AND i.snapshot_id = $3
        FOR UPDATE`,
      [input.callback.requestId, source.id, source.snapshotId],
    );
    const invocation = invocationResult.rows[0];
    if (!invocation) throw new ArticleAiError('casio_callback_invocation_not_found', 404);
    if (invocation.snapshot_content_revision !== source.contentRevision || invocation.content_sha256 !== source.contentSha256) {
      throw new ArticleAiError('casio_callback_source_mismatch', 409);
    }
    if (invocation.casio_run_id && invocation.casio_run_id !== input.callback.runId) {
      throw new ArticleAiError('casio_callback_run_mismatch', 409);
    }

    const duplicateDelivery = await client.query(
      `SELECT id FROM casio_callback_receipts WHERE invocation_id = $1 AND idempotency_key = $2`,
      [invocation.id, input.callback.idempotencyKey],
    );
    if (duplicateDelivery.rowCount) {
      await client.query('COMMIT');
      return { idempotent: true, state: 'completed', proposalsCreated: 0 };
    }

    const reusedNonce = await client.query(
      `SELECT id FROM casio_callback_receipts WHERE nonce = $1`,
      [input.nonce],
    );
    if (reusedNonce.rowCount) throw new ArticleAiError('casio_callback_nonce_reused', 409);

    await client.query(
      `INSERT INTO casio_callback_receipts
         (invocation_id, callback_event_id, casio_run_id, request_id, idempotency_key, nonce, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invocation.id,
        input.callback.eventId,
        input.callback.runId,
        input.callback.requestId,
        input.callback.idempotencyKey,
        input.nonce,
        input.callback.status,
      ],
    );

    const stale = input.callback.status === 'completed'
      && invocation.current_content_revision !== invocation.snapshot_content_revision;
    const state: CasioFlowInvocation['state'] = input.callback.status === 'completed'
      ? (stale ? 'stale' : 'completed')
      : input.callback.status === 'cancelled'
        ? 'cancelled'
        : 'failed';
    await client.query(
      `UPDATE casio_flow_invocations
          SET casio_run_id = COALESCE(casio_run_id, $1), state = $2,
              last_error_code = $3, completed_at = now()
        WHERE id = $4`,
      [input.callback.runId, state, input.callback.error?.code ?? null, invocation.id],
    );

    let proposalsCreated = 0;
    if (input.callback.status === 'completed' && input.callback.result) {
      for (const [suggestionIndex, suggestion] of input.callback.result.suggestions.entries()) {
        const inserted = await client.query(
          `INSERT INTO article_ai_proposals
             (article_id, snapshot_id, invocation_id, suggestion_index, proposal_type, anchor,
              original_text, suggested_text, reason, confidence, state, flow_key, flow_version,
              casio_run_id, artifact_refs, memory_refs, provenance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (invocation_id, suggestion_index) DO NOTHING
           RETURNING id`,
          [
            invocation.article_id,
            invocation.snapshot_id,
            invocation.id,
            suggestionIndex,
            suggestion.type,
            suggestion.anchor,
            suggestion.originalText ?? null,
            suggestion.suggestedText ?? null,
            suggestion.reason,
            suggestion.confidence ?? null,
            stale ? 'stale' : 'pending_review',
            input.callback.flowKey,
            input.callback.provenance.flowVersion,
            input.callback.runId,
            input.callback.artifactRefs,
            input.callback.memoryRefs,
            input.callback.provenance,
          ],
        );
        proposalsCreated += inserted.rowCount ?? 0;
      }
    }

    await client.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, request_id, metadata)
       VALUES ($1, $2, 'article', $3, $4, $5)`,
      [
        invocation.requested_by_user_id,
        input.callback.status === 'completed' ? 'article.ai.editorial_suggestion.completed' : 'article.ai.editorial_suggestion.failed',
        invocation.article_id,
        input.callback.requestId,
        {
          flowKey: input.callback.flowKey,
          runId: input.callback.runId,
          state,
          proposalsCreated,
          stale,
        },
      ],
    );

    await client.query('COMMIT');
    return { idempotent: false, state, proposalsCreated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
