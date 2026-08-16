import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/pool.js';

const querySchema = z.object({
  q: z.string().trim().min(2).max(200),
  locale: z.enum(['fa', 'en']).optional().default('fa'),
});

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get('/api/v1/search/suggestions', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_input' });
    const { q, locale } = parsed.data;
    const pattern = `%${q}%`;
    const titleColumn = locale === 'en' ? 'title_en' : 'title_fa';
    const result = await db.query<{ suggestion: string }>(
      `SELECT DISTINCT ${titleColumn} AS suggestion
       FROM articles
       WHERE status = 'published' AND ${titleColumn} ILIKE $1 AND ${titleColumn} <> ''
       ORDER BY ${titleColumn}
       LIMIT 8`,
      [pattern],
    );
    return reply.send({ ok: true, suggestions: result.rows.map((row) => row.suggestion) });
  });
}
