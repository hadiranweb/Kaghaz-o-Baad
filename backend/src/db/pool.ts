import pg from 'pg';
import { loadEnv } from '../config/env.js';

const { Pool } = pg;
const env = loadEnv();

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

export async function closeDatabase() {
  await db.end();
}
