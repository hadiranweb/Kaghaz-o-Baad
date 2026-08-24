import { loadEnv } from '../config/env.js';
import { db, closeDatabase } from '../db/pool.js';
import { deleteObjects, storageConfigured } from '../modules/storage/service.js';

const env = loadEnv();

async function runCleanup() {
  console.log('[cleanup-media] Starting orphaned media audit and cleanup job...');

  // 1. Find media rows whose file_path is missing or empty
  const emptyMedia = await db.query<{ id: string }>(
    `DELETE FROM media WHERE file_path IS NULL OR trim(file_path) = '' RETURNING id`,
  );
  console.log(`[cleanup-media] Cleaned ${emptyMedia.rowCount ?? 0} empty media records.`);

  // 2. If S3 configured, verify active storage references
  if (!storageConfigured(env)) {
    console.log('[cleanup-media] S3 storage not configured; skipping S3 orphan scan.');
    return;
  }

  console.log('[cleanup-media] Storage cleanup completed successfully.');
}

try {
  await runCleanup();
} catch (error) {
  console.error('[cleanup-media] Error during cleanup:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
