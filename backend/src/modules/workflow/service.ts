import type { PoolClient } from 'pg';
import { db } from '../../db/pool.js';
import type { AuthUser } from '../../auth/service.js';

export const workflowActions = [
  'submit_for_review',
  'request_changes',
  'approve',
  'schedule',
  'publish',
  'archive',
  'restore_draft',
] as const;

export type WorkflowAction = (typeof workflowActions)[number];
export type ArticleStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'scheduled' | 'published' | 'archived';

const transitions: Record<WorkflowAction, readonly [ArticleStatus, ArticleStatus][]> = {
  submit_for_review: [['draft', 'in_review'], ['changes_requested', 'in_review']],
  request_changes: [['in_review', 'changes_requested']],
  approve: [['in_review', 'approved']],
  schedule: [['approved', 'scheduled']],
  publish: [['approved', 'published'], ['scheduled', 'published']],
  archive: [['published', 'archived']],
  restore_draft: [['archived', 'draft'], ['changes_requested', 'draft']],
};

function hasRole(user: AuthUser, ...roles: string[]) {
  return roles.some((role) => user.roles.includes(role));
}

function canManageWorkflow(user: AuthUser) {
  return hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager');
}

function allowed(user: AuthUser, action: WorkflowAction, article: { author_id: string | null; status: ArticleStatus }) {
  const owner = article.author_id === user.id;
  const manager = canManageWorkflow(user);
  const contributor = hasRole(user, 'author', 'contributor');
  const validTransition = transitions[action].some(([from]) => from === article.status);
  if (!validTransition) return false;
  if (action === 'submit_for_review') return (owner && contributor) || manager;
  if (action === 'restore_draft') return (owner && contributor) || manager;
  return manager;
}

export async function transitionArticle(input: {
  articleId: string;
  action: WorkflowAction;
  note?: string;
  metadata?: Record<string, unknown>;
  actor: AuthUser;
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const articleResult = await client.query<{ id: string; author_id: string | null; status: ArticleStatus }>(
      'SELECT id, author_id, status FROM articles WHERE id = $1 FOR UPDATE',
      [input.articleId],
    );
    const article = articleResult.rows[0];
    if (!article) throw Object.assign(new Error('article_not_found'), { statusCode: 404 });
    if (!allowed(input.actor, input.action, article)) {
      throw Object.assign(new Error('forbidden_transition'), { statusCode: 403 });
    }

    const nextStatus = transitions[input.action].find(([from]) => from === article.status)?.[1];
    if (!nextStatus) throw Object.assign(new Error('invalid_transition'), { statusCode: 409 });

    await client.query(
      `UPDATE articles
       SET status = $1,
           published_at = CASE
             WHEN $1 = 'published' THEN COALESCE(published_at, now())
             WHEN $1 <> 'published' AND status = 'published' THEN NULL
             ELSE published_at
           END,
           updated_at = now()
       WHERE id = $2`,
      [nextStatus, input.articleId],
    );

    const event = await client.query(
      `INSERT INTO article_workflow_events
         (article_id, actor_id, from_status, to_status, action, note, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [input.articleId, input.actor.id, article.status, nextStatus, input.action, input.note ?? null, input.metadata ?? {}],
    );

    await client.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.actor.id, `article.workflow.${input.action}`, 'article', input.articleId, { from: article.status, to: nextStatus }],
    );

    await client.query('COMMIT');
    return {
      articleId: input.articleId,
      fromStatus: article.status,
      toStatus: nextStatus,
      eventId: event.rows[0]?.id as string,
      actorId: input.actor.id,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
