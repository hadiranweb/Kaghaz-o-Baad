import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';

const migrationsDirectory = join(process.cwd(), 'migrations');
const migrationTable = 'schema_migrations';

type Database = typeof import('./pool.js').db;

async function migrationFiles() {
  const files = await readdir(migrationsDirectory);
  return files.filter((file) => /^\d+.*\.sql$/.test(file)).sort();
}

function checksum(contents: string) {
  return createHash('sha256').update(contents).digest('hex');
}

async function ensureMigrationTable(database: Database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS ${migrationTable} (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate(options: { dryRun?: boolean } = {}) {
  const files = await migrationFiles();
  if (options.dryRun) {
    return files.map((file) => ({ file, path: join(migrationsDirectory, file) }));
  }

  const { db: database } = await import('./pool.js');
  await ensureMigrationTable(database);
  const applied = await database.query<{ version: string; checksum: string }>(
    `SELECT version, checksum FROM ${migrationTable} ORDER BY version`,
  );
  const appliedByVersion = new Map(applied.rows.map((row) => [row.version, row.checksum]));

  for (const file of files) {
    const version = basename(file, '.sql').match(/^\d+/)?.[0];
    if (!version) throw new Error(`invalid_migration_filename:${file}`);
    const contents = await readFile(join(migrationsDirectory, file), 'utf8');
    const digest = checksum(contents);
    const previous = appliedByVersion.get(version);

    if (previous) {
      if (previous !== digest) throw new Error(`migration_checksum_mismatch:${version}`);
      continue;
    }

    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query(contents);
      await client.query(
        `INSERT INTO ${migrationTable} (version, name, checksum) VALUES ($1, $2, $3)`,
        [version, file, digest],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return files;
}

if (process.argv[1]?.endsWith('/migrate.ts') || process.argv[1]?.endsWith('/migrate.js')) {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    const files = await migrate({ dryRun: true });
    console.log(JSON.stringify({ dryRun: true, migrations: files }, null, 2));
  } else {
    await migrate();
    console.log('Database migrations completed.');
  }
  if (!dryRun) {
    const { db: database } = await import('./pool.js');
    await database.end();
  }
}
