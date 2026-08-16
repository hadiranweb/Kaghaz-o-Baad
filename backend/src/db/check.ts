const { db } = await import('./pool.js');

try {
  const result = await db.query<{ now: string }>('SELECT now()::text AS now');
  console.log(JSON.stringify({ ok: true, database: 'postgresql', serverTime: result.rows[0]?.now }, null, 2));
} finally {
  await db.end();
}
