import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('reports/lighthouse-2026-08-22/home-font-final-cold.json','utf8'));
console.log(JSON.stringify(r.audits['layout-shifts']?.details?.items ?? [],null,2));
