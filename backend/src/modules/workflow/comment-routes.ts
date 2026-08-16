import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import type { AuthUser } from '../../auth/service.js';

const createSchema = z.object({
  source: z.enum(['human', 'ai']).default('human'),
  body: z.string().trim().min(1).max(10000),
  suggestedText: z.string().max(10000).optional(),
  anchor: z.record(z.unknown()).default({}),
});

const resolveSchema = z.object({
  status: z.enum(['open', 'accepted', 'rejected', 'resolved']),
});

function canReview(user: AuthUser, authorId: string | null) {
  return authorId === user.id || user.roles.includes('editor') || user.roles.includes('admin');
}

export async function registerCommentRoutes(app: FastifyInstance) {
  app.get('/api/v1/articles/:articleId/comments', async (request, reply) => {
    const params = z.object({ articleId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query(
      `SELECT c.*, u.first_name, u.last_name
       FROM article_comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.article_id = $1
       ORDER BY c.created_at ASC`,
      [params.data.articleId],
    );
    return reply.send({ ok: true, comments: result.rows });
  });

  app.post('/api/v1/articles/:articleId/comments', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });

    const params = z.object({ articleId: z.string().uuid() }).safeParse(request.params);
    const body = createSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });

    const article = await db.query<{ author_id: string | null }>(
      'SELECT author_id FROM articles WHERE id = $1',
      [params.data.articleId],
    );
    const row = article.rows[0];
    if (!row) return reply.status(404).send({ error: 'article_not_found' });
    if (!canReview(user, row.author_id)) return reply.status(403).send({ error: 'forbidden' });

    const result = await db.query(
      `INSERT INTO article_comments (article_id, author_id, source, body, suggested_text, anchor)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [params.data.articleId, user.id, body.data.source, body.data.body, body.data.suggestedText ?? null, body.data.anchor],
    );
    await db.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, 'article.comment.created', 'article', $2, $3)`,
      [user.id, params.data.articleId, { source: body.data.source }],
    );
    return reply.status(201).send({ ok: true, comment: result.rows[0] });
  });

  app.delete('/api/v1/comments/:commentId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ commentId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query<{ id: string; author_id: string | null; article_id: string }>('SELECT id, author_id, article_id FROM article_comments WHERE id = $1', [params.data.commentId]);
    const comment = result.rows[0];
    if (!comment) return reply.status(404).send({ error: 'comment_not_found' });
    if (comment.author_id !== user.id && !user.roles.some((role) => ['editor', 'admin'].includes(role))) return reply.status(403).send({ error: 'forbidden' });
    await db.query('DELETE FROM article_comments WHERE id = $1', [params.data.commentId]);
    return reply.status(204).send();
  });

  app.patch('/api/v1/comments/:commentId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ commentId: z.string().uuid() }).safeParse(request.params);
    const body = resolveSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });

    const result = await db.query<{ id: string; article_id: string; author_id: string | null }>(
      `SELECT c.id, c.article_id, a.author_id
       FROM article_comments c JOIN articles a ON a.id = c.article_id
       WHERE c.id = $1`,
      [params.data.commentId],
    );
    const comment = result.rows[0];
    if (!comment) return reply.status(404).send({ error: 'comment_not_found' });
    if (!canReview(user, comment.author_id)) return reply.status(403).send({ error: 'forbidden' });

    const updated = await db.query(
      `UPDATE article_comments
       SET status = $1,
           resolved_at = CASE WHEN $1 = 'open' THEN NULL ELSE now() END,
           resolved_by = CASE WHEN $1 = 'open' THEN NULL ELSE $2 END
       WHERE id = $3
       RETURNING *`,
      [body.data.status, user.id, params.data.commentId],
    );
    await db.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, 'article.comment.resolved', 'comment', $2, $3)`,
      [user.id, params.data.commentId, { status: body.data.status }],
    );
    return reply.send({ ok: true, comment: updated.rows[0] });
  });
}
