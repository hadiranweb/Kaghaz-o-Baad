import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const [url = 'http://localhost:8080/', output = 'reports/layout-shift-trace.json'] = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await page.emulateCPUThrottling(4);
await page.emulateNetworkConditions({ offline: false, latency: 150, download: 1600 * 1024 / 8, upload: 750 * 1024 / 8 });
await page.evaluateOnNewDocument(() => {
  window.__layoutTrace = { shifts: [], total: 0, startedAt: performance.now() };
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
    if (entry.hadRecentInput) return;
    const sources = (entry.sources || []).map((source) => ({ selector: source.node?.tagName ? `${source.node.tagName.toLowerCase()}${source.node.id ? `#${source.node.id}` : ''}${source.node.className && typeof source.node.className === 'string' ? `.${source.node.className.trim().replace(/\\s+/g, '.')}` : ''}` : null, previousRect: source.previousRect, currentRect: source.currentRect }));
    window.__layoutTrace.total += entry.value;
    window.__layoutTrace.shifts.push({ startTime: entry.startTime, value: entry.value, sources });
  })).observe({ type: 'layout-shift', buffered: true });
});
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
await sleep(2500);
const trace = await page.evaluate(() => ({ ...window.__layoutTrace, navigation: performance.getEntriesByType('navigation')[0]?.toJSON(), footer: document.querySelector('footer')?.getBoundingClientRect().toJSON(), main: document.querySelector('main')?.getBoundingClientRect().toJSON() }));
trace.url = url;
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(output, JSON.stringify(trace, null, 2));
console.log(JSON.stringify({ url, cls: trace.total, shifts: trace.shifts.length, output, footer: trace.footer, main: trace.main }));
await browser.close();
