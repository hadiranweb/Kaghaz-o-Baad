import { db } from '../db/pool.js';

export async function cleanupExpiredAiCache(batchSize = 1000) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) throw new Error('invalid_batch_size');
  const result = await db.query<{ deleted: number }>(
    `WITH expired AS (
       SELECT cache_key FROM ai_response_cache
       WHERE expires_at <= now()
       ORDER BY expires_at ASC
       LIMIT $1
     ), deleted AS (
       DELETE FROM ai_response_cache c
       USING expired e
       WHERE c.cache_key = e.cache_key
       RETURNING c.cache_key
     )
     SELECT COUNT(*)::int AS deleted FROM deleted`,
    [batchSize],
  );
  return { deleted: Number(result.rows[0]?.deleted ?? 0), batchSize, completedAt: new Date().toISOString() };
}

if (process.argv[1]?.endsWith('/cleanup-ai-cache.ts') || process.argv[1]?.endsWith('/cleanup-ai-cache.js')) {
  const batchSize = Number(process.env.CACHE_CLEANUP_BATCH_SIZE ?? 1000);
  const result = await cleanupExpiredAiCache(batchSize);
  console.log(JSON.stringify(result));
  await db.end();
}
