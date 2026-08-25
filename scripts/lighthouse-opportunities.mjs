import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const rows = Object.values(report.audits).filter((audit) => audit.score !== null && audit.score < 1 && audit.details?.type !== 'debugdata').sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 8).map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, displayValue: audit.displayValue ?? null, savings: audit.details?.overallSavingsMs ?? null }));
  console.log(file, JSON.stringify(rows));
}
