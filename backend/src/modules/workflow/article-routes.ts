import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';

const createSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleFa: z.string().trim().min(1).max(300),
  titleEn: z.string().trim().max(300).default(''),
  contentFa: z.string().default(''),
  contentEn: z.string().default(''),
});

const updateSchema = createSchema.partial().extend({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
});

const idSchema = z.object({ articleId: z.string().uuid() });

function canManageAll(user: { roles: string[] }) {
  return hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager');
}

function isAuthorRole(user: { roles: string[] }) {
  return hasRole(user, 'author', 'contributor');
}

export async function registerArticleRoutes(app: FastifyInstance) {
  app.post('/api/v1/articles', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!isAuthorRole(user) && !canManageAll(user)) return reply.status(403).send({ error: 'forbidden' });
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input', details: body.error.flatten() });

    try {
      const result = await db.query(
        `INSERT INTO articles (author_id, slug, title_fa, title_en, content_fa, content_en)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user.id, body.data.slug, body.data.titleFa, body.data.titleEn, body.data.contentFa, body.data.contentEn],
      );
      const article = result.rows[0];
      await db.query(
        `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
         VALUES ($1, 'article.created', 'article', $2, $3)`,
        [user.id, article.id, { status: article.status }],
      );
      return reply.status(201).send({ ok: true, article });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return reply.status(409).send({ error: 'slug_already_exists' });
      }
      throw error;
    }
  });

  app.get('/api/v1/articles', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const canSeeAll = canManageAll(user);
    const result = await db.query(
      canSeeAll
        ? 'SELECT * FROM articles ORDER BY updated_at DESC'
        : 'SELECT * FROM articles WHERE author_id = $1 ORDER BY updated_at DESC',
      canSeeAll ? [] : [user.id],
    );
    return reply.send({ ok: true, articles: result.rows });
  });

  app.delete('/api/v1/articles/:articleId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = idSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query<{ author_id: string | null }>('SELECT author_id FROM articles WHERE id = $1', [params.data.articleId]);
    const article = result.rows[0];
    if (!article) return reply.status(404).send({ error: 'article_not_found' });
    if (!canManageAll(user) && article.author_id !== user.id) return reply.status(403).send({ error: 'forbidden' });
    await db.query('DELETE FROM articles WHERE id = $1', [params.data.articleId]);
    return reply.status(204).send();
  });

  app.get('/api/v1/articles/:articleId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = idSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query('SELECT * FROM articles WHERE id = $1', [params.data.articleId]);
    const article = result.rows[0];
    if (!article) return reply.status(404).send({ error: 'article_not_found' });
    if (!canManageAll(user) && article.author_id !== user.id) return reply.status(403).send({ error: 'forbidden' });
    return reply.send({ ok: true, article });
  });

  app.patch('/api/v1/articles/:articleId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = idSchema.safeParse(request.params);
    const body = updateSchema.safeParse(request.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) return reply.status(400).send({ error: 'invalid_input' });

    const currentResult = await db.query('SELECT * FROM articles WHERE id = $1', [params.data.articleId]);
    const current = currentResult.rows[0];
    if (!current) return reply.status(404).send({ error: 'article_not_found' });
    const privileged = canManageAll(user);
    if (!privileged && current.author_id !== user.id) return reply.status(403).send({ error: 'forbidden' });
    if (!privileged && !['draft', 'changes_requested'].includes(current.status)) return reply.status(409).send({ error: 'article_not_editable_in_current_status' });

    const fields = [['slug', body.data.slug], ['title_fa', body.data.titleFa], ['title_en', body.data.titleEn], ['content_fa', body.data.contentFa], ['content_en', body.data.contentEn] as const].filter(([, value]) => value !== undefined);
    const values: unknown[] = [];
    const assignments = fields.map(([column, value]) => { values.push(value); return `${column} = $${values.length}`; });
    values.push(params.data.articleId);
    const updated = await db.query(`UPDATE articles SET ${assignments.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
    await db.query(
      `INSERT INTO activity_events (user_id, event_name, entity_type, entity_id, metadata)
       VALUES ($1, 'article.updated', 'article', $2, $3)`,
      [user.id, current.id, { fields: fields.map(([column]) => column) }],
    );
    return reply.send({ ok: true, article: updated.rows[0] });
  });
}
