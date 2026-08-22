import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const url = process.argv[2] || 'http://localhost:4173/';
const outputDir = process.argv[3] || 'reports/lighthouse-2026-08-22/lcp-repetitions';
fs.mkdirSync(outputDir, { recursive: true });
const results = [];
const run = (kind, repetition, profile) => {
  const file = `${outputDir}/${kind}-${repetition}.json`;
  const args = [
    '--yes', 'lighthouse', url, '--quiet', '--enable-error-reporting=false',
    '--chrome-flags', `--headless --no-sandbox --user-data-dir=${profile}`,
    '--only-categories=performance', '--output=json', `--output-path=${file}`,
    '--throttling-method=simulate', '--throttling.rttMs=150', '--throttling.throughputKbps=1600',
    '--throttling.cpuSlowdownMultiplier=4', '--screenEmulation.mobile=true',
  ];
  if (kind === 'warm') args.splice(4, 0, '--disable-storage-reset');
  execFileSync('npx', args, { stdio: 'inherit' });
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = {
    kind, repetition,
    score: report.categories.performance.score,
    lcpMs: report.audits['largest-contentful-paint'].numericValue,
    cls: report.audits['cumulative-layout-shift'].numericValue,
    tbtMs: report.audits['total-blocking-time'].numericValue,
    transferBytes: report.audits['total-byte-weight'].numericValue,
    requests: report.audits['network-requests']?.details?.items?.length ?? null,
    lcpElement: report.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector ?? null,
  };
  results.push(row);
  console.log(JSON.stringify(row));
};

for (let i = 1; i <= 3; i++) {
  const coldProfile = `/tmp/lighthouse-lcp-cold-${i}`;
  fs.rmSync(coldProfile, { recursive: true, force: true });
  run('cold', i, coldProfile);
  const warmProfile = `/tmp/lighthouse-lcp-warm-${i}`;
  fs.rmSync(warmProfile, { recursive: true, force: true });
  const warmPrime = `${outputDir}/warm-${i}-prime.json`;
  const primeArgs = ['--yes', 'lighthouse', url, '--quiet', '--enable-error-reporting=false', '--chrome-flags', `--headless --no-sandbox --user-data-dir=${warmProfile}`, '--only-categories=performance', '--output=json', `--output-path=${warmPrime}`, '--throttling-method=simulate', '--throttling.rttMs=150', '--throttling.throughputKbps=1600', '--throttling.cpuSlowdownMultiplier=4', '--screenEmulation.mobile=true'];
  execFileSync('npx', primeArgs, { stdio: 'ignore' });
  run('warm', i, warmProfile);
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = { url, results, medians: {} };
for (const kind of ['cold', 'warm']) {
  const rows = results.filter((row) => row.kind === kind);
  summary.medians[kind] = {
    lcpMs: median(rows.map((row) => row.lcpMs)),
    cls: median(rows.map((row) => row.cls)),
    tbtMs: median(rows.map((row) => row.tbtMs)),
    transferBytes: median(rows.map((row) => row.transferBytes)),
    score: median(rows.map((row) => row.score)),
  };
}
fs.writeFileSync(`${outputDir}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.medians));
