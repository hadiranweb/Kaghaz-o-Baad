import fs from 'node:fs';
for (const file of ['home-font-final-cold.json','home-font-final-warm.json']) {
  const report = JSON.parse(fs.readFileSync(`reports/lighthouse-2026-08-22/${file}`, 'utf8'));
  const a = report.audits;
  console.log(JSON.stringify({file, score: report.categories.performance.score, lcp: a['largest-contentful-paint'].displayValue, cls: a['cumulative-layout-shift'].displayValue, tbt: a['total-blocking-time'].displayValue, transfer: a['total-byte-weight'].displayValue, requests: a['network-requests']?.details?.items?.length ?? null, lcpElement: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector ?? null}));
}
