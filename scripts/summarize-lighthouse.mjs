import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const audits = report.audits;
  const value = (id) => audits[id]?.numericValue ?? null;
  const display = (id) => audits[id]?.displayValue ?? null;
  const requests = audits['network-requests']?.details?.items?.length ?? null;
  console.log(JSON.stringify({
    route: file.replace('.json', ''),
    performanceScore: report.categories.performance?.score ?? null,
    lcpMs: value('largest-contentful-paint'),
    lcpDisplay: display('largest-contentful-paint'),
    cls: value('cumulative-layout-shift'),
    clsDisplay: display('cumulative-layout-shift'),
    inpMs: value('interaction-to-next-paint'),
    inpDisplay: display('interaction-to-next-paint'),
    tbtMs: value('total-blocking-time'),
    tbtDisplay: display('total-blocking-time'),
    ttfbMs: value('server-response-time'),
    ttfbDisplay: display('server-response-time'),
    speedIndexMs: value('speed-index'),
    transferBytes: audits['total-byte-weight']?.numericValue ?? null,
    transferDisplay: display('total-byte-weight'),
    requests,
    url: report.finalDisplayedUrl,
  }));
}
