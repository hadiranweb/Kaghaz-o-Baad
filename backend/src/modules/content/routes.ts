import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAuthUser, hasRole } from '../../auth/service.js';
import { db } from '../../db/pool.js';
import type { AppEnv } from '../../config/env.js';
import { createUploadUrl, deleteObject, storageConfigured } from '../storage/service.js';

const uuidParams = z.object({ id: z.string().uuid() });
const articleParams = z.object({ articleId: z.string().uuid() });
const profileSchema = z.object({
  firstName: z.string().trim().max(120).optional().nullable(),
  lastName: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  avatarUrl: z.string().url().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});
const mediaSchema = z.object({
  type: z.string().trim().min(1).max(80),
  title: z.string().max(300).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  filePath: z.string().max(2000).optional().nullable(),
  publicUrl: z.string().url().max(2000).optional().nullable(),
  visibility: z.enum(['private', 'public']).optional().default('private'),
  metadata: z.record(z.unknown()).optional().default({}),
  fileSize: z.number().int().nonnegative().max(10_000_000_000).optional().default(0),
});
const projectSchema = z.object({
  title: z.string().max(300).optional().default(''),
  description: z.string().max(10000).optional().default(''),
  metadata: z.record(z.unknown()).optional().default({}),
});
const slideSchema = z.object({
  title: z.string().max(300).optional().default(''),
  content: z.record(z.unknown()).optional().default({}),
  sortOrder: z.number().int().min(0).optional().default(0),
});
const liveSessionSchema = z.object({
  title: z.string().max(300).optional().default(''),
  description: z.string().max(5000).optional().default(''),
  roomName: z.string().trim().min(1).max(180),
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional().default('scheduled'),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

function canManageAll(user: { roles: string[] }) {
  return hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager');
}

export async function registerContentRoutes(app: FastifyInstance, env?: AppEnv) {
  app.post('/api/v1/media/upload-url', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    if (!env || !storageConfigured(env)) return reply.status(503).send({ error: 'storage_not_configured' });
    const body = z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(200), type: z.string().trim().min(1).max(80) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    const safeName = body.data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${user.id}/${body.data.type}/${Date.now()}-${safeName}`;
    const upload = await createUploadUrl(env, { key, contentType: body.data.contentType });
    return reply.send({ ok: true, ...upload });
  });

  app.get('/api/v1/me/profile', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
    return reply.send({ ok: true, profile: result.rows[0] ?? null });
  });

  app.put('/api/v1/me/profile', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = profileSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input', details: body.error.flatten() });
    const d = body.data;
    const result = await db.query(
      `INSERT INTO profiles (user_id, first_name, last_name, phone, bio, avatar_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name, phone = EXCLUDED.phone, bio = EXCLUDED.bio,
         avatar_url = EXCLUDED.avatar_url, metadata = EXCLUDED.metadata, updated_at = now()
       RETURNING *`,
      [user.id, d.firstName ?? null, d.lastName ?? null, d.phone ?? null, d.bio ?? null, d.avatarUrl ?? null, d.metadata ?? {}],
    );
    return reply.send({ ok: true, profile: result.rows[0] });
  });

  app.get('/api/v1/public/articles', async (request, reply) => {
    const query = request.query as { q?: string; cursorTime?: string; cursorId?: string; limit?: string };
    const limit = Math.min(Math.max(Number(query.limit ?? 9), 1), 50);
    const values: unknown[] = [];
    const conditions = ["status = 'published'"];
    if (query.q?.trim()) {
      values.push(`%${query.q.trim()}%`);
      conditions.push(`(title_fa ILIKE $${values.length} OR title_en ILIKE $${values.length} OR summary_fa ILIKE $${values.length} OR summary_en ILIKE $${values.length})`);
    }
    if (query.cursorTime && query.cursorId) {
      values.push(query.cursorTime, query.cursorId);
      conditions.push(`(published_at, id) < ($${values.length - 1}, $${values.length})`);
    }
    values.push(limit + 1);
    const result = await db.query(`SELECT id, slug, title_fa, title_en, summary_fa, summary_en, cover_url, tags, categories, status, author_id, published_at, created_at, updated_at FROM articles WHERE ${conditions.join(' AND ')} ORDER BY published_at DESC NULLS LAST, id DESC LIMIT $${values.length}`, values);
    return reply.send({ ok: true, articles: result.rows, hasMore: result.rows.length > limit });
  });

  app.get('/api/v1/public/profiles', async (request, reply) => {
    const query = request.query as { ids?: string; community?: string };
    const ids = (query.ids ?? '').split(',').map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (ids.length > 0) {
      values.push(ids);
      conditions.push(`user_id = ANY($${values.length}::uuid[])`);
    }
    if (query.community === 'true') conditions.push("COALESCE((metadata->>'show_in_community')::boolean, false) = true");
    if (conditions.length === 0) return reply.send({ ok: true, profiles: [] });
    const result = await db.query(`SELECT user_id AS id, first_name, last_name, avatar_url, bio, metadata FROM profiles WHERE ${conditions.join(' AND ')} ORDER BY COALESCE(metadata->>'display_name', first_name, last_name) ASC LIMIT 100`, values);
    return reply.send({ ok: true, profiles: result.rows });
  });

  app.get('/api/v1/translations', async (_request, reply) => {
    const result = await db.query('SELECT key, en, fa FROM translations ORDER BY key');
    return reply.send({ ok: true, translations: result.rows });
  });

  app.get('/api/v1/me/storage', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const result = await db.query<{ used_bytes: string }>('SELECT COALESCE(SUM(file_size), 0)::text AS used_bytes FROM media WHERE owner_id = $1', [user.id]);
    return reply.send({ ok: true, usedBytes: Number(result.rows[0]?.used_bytes ?? 0) });
  });

  app.get('/api/v1/media', async (request, reply) => {
    const user = await getAuthUser(request);
    const query = request.query as { type?: string; visibility?: string; mine?: string };
    const values: unknown[] = [];
    const conditions = ['(visibility = \'public\''] as string[];
    if (user) { values.push(user.id); conditions[0] += ` OR owner_id = $${values.length}`; }
    conditions[0] += ')';
    if (query.type) { values.push(query.type); conditions.push(`type = $${values.length}`); }
    if (query.visibility === 'public') conditions.push("visibility = 'public'");
    if (query.mine === 'true') {
      if (!user) return reply.status(401).send({ error: 'unauthorized' });
      conditions.push(`owner_id = $1`);
    }
    const result = await db.query(`SELECT * FROM media WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`, values);
    return reply.send({ ok: true, media: result.rows });
  });

  app.post('/api/v1/media', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = mediaSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input', details: body.error.flatten() });
    const d = body.data;
    const result = await db.query(
      `INSERT INTO media (owner_id, created_by, type, title, description, file_path, public_url, visibility, metadata, file_size)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user.id, d.type, d.title, d.description, d.filePath ?? null, d.publicUrl ?? null, d.visibility, d.metadata, d.fileSize],
    );
    return reply.status(201).send({ ok: true, media: result.rows[0] });
  });

  app.patch('/api/v1/media/:id', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = uuidParams.safeParse(request.params);
    const body = mediaSchema.partial().safeParse(request.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) return reply.status(400).send({ error: 'invalid_input' });
    const current = await db.query('SELECT * FROM media WHERE id = $1', [params.data.id]);
    if (!current.rows[0]) return reply.status(404).send({ error: 'media_not_found' });
    if (!canManageAll(user) && current.rows[0].owner_id !== user.id) return reply.status(403).send({ error: 'forbidden' });
    const map: Record<string, string> = { type: 'type', title: 'title', description: 'description', filePath: 'file_path', publicUrl: 'public_url', visibility: 'visibility', metadata: 'metadata', fileSize: 'file_size' };
    const values: unknown[] = [];
    const fields = Object.entries(body.data).map(([key, value]) => { values.push(value ?? null); return `${map[key]} = $${values.length}`; });
    values.push(params.data.id);
    const updated = await db.query(`UPDATE media SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
    return reply.send({ ok: true, media: updated.rows[0] });
  });

  app.delete('/api/v1/media/:id', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = uuidParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query<{ id: string; file_path: string | null }>('DELETE FROM media WHERE id = $1 AND (owner_id = $2 OR $3 = TRUE) RETURNING id, file_path', [params.data.id, user.id, canManageAll(user)]);
    if (!result.rows[0]) return reply.status(404).send({ error: 'media_not_found' });
    if (env && result.rows[0].file_path && storageConfigured(env)) await deleteObject(env, result.rows[0].file_path).catch(() => undefined);
    return reply.status(204).send();
  });

  app.get('/api/v1/projects/descriptions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const result = await db.query('SELECT * FROM project_description WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
    return reply.send({ ok: true, descriptions: result.rows });
  });

  app.post('/api/v1/projects/descriptions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = projectSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    const d = body.data;
    const result = await db.query('INSERT INTO project_description (user_id, title, description, metadata) VALUES ($1, $2, $3, $4) RETURNING *', [user.id, d.title, d.description, d.metadata]);
    return reply.status(201).send({ ok: true, description: result.rows[0] });
  });

  app.patch('/api/v1/projects/descriptions/:id', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = uuidParams.safeParse(request.params);
    const body = projectSchema.partial().safeParse(request.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) return reply.status(400).send({ error: 'invalid_input' });
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.data.title !== undefined) { values.push(body.data.title); fields.push(`title = $${values.length}`); }
    if (body.data.description !== undefined) { values.push(body.data.description); fields.push(`description = $${values.length}`); }
    if (body.data.metadata !== undefined) { values.push(body.data.metadata); fields.push(`metadata = $${values.length}`); }
    values.push(params.data.id, user.id);
    const result = await db.query(`UPDATE project_description SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`, values);
    if (!result.rows[0]) return reply.status(404).send({ error: 'description_not_found' });
    return reply.send({ ok: true, description: result.rows[0] });
  });

  app.delete('/api/v1/projects/descriptions/:id', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = uuidParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query('DELETE FROM project_description WHERE id = $1 AND user_id = $2 RETURNING id', [params.data.id, user.id]);
    if (!result.rows[0]) return reply.status(404).send({ error: 'description_not_found' });
    return reply.status(204).send();
  });

  app.patch('/api/v1/slides/:slideId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ slideId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ title: z.string().max(500).optional(), content: z.record(z.unknown()).optional(), sortOrder: z.number().int().min(0).optional() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    const owner = await db.query('SELECT owner_id FROM slides WHERE id = $1', [params.data.slideId]);
    if (!owner.rows[0]) return reply.status(404).send({ error: 'slide_not_found' });
    if (owner.rows[0].owner_id !== user.id && !hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager')) return reply.status(403).send({ error: 'forbidden' });
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.data.title !== undefined) { values.push(body.data.title); fields.push(`title = $${values.length}`); }
    if (body.data.content !== undefined) { values.push(body.data.content); fields.push(`content = $${values.length}`); }
    if (body.data.sortOrder !== undefined) { values.push(body.data.sortOrder); fields.push(`sort_order = $${values.length}`); }
    if (fields.length === 0) return reply.status(400).send({ error: 'invalid_input' });
    values.push(params.data.slideId);
    const updated = await db.query(`UPDATE slides SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`, values);
    return reply.send({ ok: true, slide: updated.rows[0] });
  });

  app.delete('/api/v1/slides/:slideId', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = z.object({ slideId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const owner = await db.query('SELECT owner_id FROM slides WHERE id = $1', [params.data.slideId]);
    if (!owner.rows[0]) return reply.status(404).send({ error: 'slide_not_found' });
    if (owner.rows[0].owner_id !== user.id && !hasRole(user, 'editor', 'admin', 'senior_manager', 'technical_manager')) return reply.status(403).send({ error: 'forbidden' });
    await db.query('DELETE FROM slides WHERE id = $1', [params.data.slideId]);
    return reply.status(204).send();
  });

  app.get('/api/v1/public/articles/by-slug/:slug', async (request, reply) => {
    const params = z.object({ slug: z.string().trim().min(1).max(160) }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query(`SELECT * FROM articles WHERE slug = $1 AND status = 'published'`, [params.data.slug]);
    if (!result.rows[0]) return reply.status(404).send({ error: 'article_not_found' });
    return reply.send({ ok: true, article: result.rows[0] });
  });

  app.get('/api/v1/articles/:articleId/slides', async (request, reply) => {
    const articleId = z.object({ articleId: z.string().uuid() }).safeParse(request.params);
    const user = await getAuthUser(request);
    if (!articleId.success) return reply.status(400).send({ error: 'invalid_input' });
    const published = await db.query(`SELECT status FROM articles WHERE id = $1`, [articleId.data.articleId]);
    if (!published.rows[0]) return reply.status(404).send({ error: 'article_not_found' });
    if (published.rows[0].status !== 'published' && !user) return reply.status(401).send({ error: 'unauthorized' });
    const params = articleParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query('SELECT * FROM slides WHERE article_id = $1 ORDER BY sort_order, created_at', [params.data.articleId]);
    return reply.send({ ok: true, slides: result.rows });
  });

  app.post('/api/v1/articles/:articleId/slides', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = articleParams.safeParse(request.params);
    const body = slideSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ error: 'invalid_input' });
    const d = body.data;
    const result = await db.query('INSERT INTO slides (article_id, owner_id, title, content, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *', [params.data.articleId, user.id, d.title, d.content, d.sortOrder]);
    return reply.status(201).send({ ok: true, slide: result.rows[0] });
  });

  app.get('/api/v1/live-sessions', async (_request, reply) => {
    const result = await db.query('SELECT * FROM live_sessions ORDER BY starts_at DESC NULLS LAST, created_at DESC LIMIT 100');
    return reply.send({ ok: true, sessions: result.rows });
  });

  app.post('/api/v1/live-sessions', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const body = liveSessionSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'invalid_input' });
    const d = body.data;
    const result = await db.query(
      `INSERT INTO live_sessions (host_id, title, description, room_name, status, starts_at, ends_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user.id, d.title, d.description, d.roomName, d.status, d.startsAt ?? null, d.endsAt ?? null, d.metadata],
    );
    return reply.status(201).send({ ok: true, session: result.rows[0] });
  });

  app.delete('/api/v1/live-sessions/:id', async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.status(401).send({ error: 'unauthorized' });
    const params = uuidParams.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_input' });
    const result = await db.query('DELETE FROM live_sessions WHERE id = $1 AND (host_id = $2 OR $3 = TRUE) RETURNING id', [params.data.id, user.id, canManageAll(user)]);
    if (!result.rows[0]) return reply.status(404).send({ error: 'session_not_found' });
    return reply.status(204).send();
  });
}
