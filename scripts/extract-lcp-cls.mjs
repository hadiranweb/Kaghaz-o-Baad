import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lcp = report.audits['largest-contentful-paint-element'];
const shifts = report.audits['layout-shifts'];
console.log(JSON.stringify({ lcp: lcp?.details?.items ?? [], shifts: shifts?.details?.items ?? [] }, null, 2));
