import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://kaghazobaad.ir';
const apiBase = (process.env.SEO_PUBLIC_API_URL || process.env.VITE_API_URL || 'https://api.kaghazobaad.ir/api/v1').replace(/\/$/, '');
const staticPaths = ['/', '/about', '/about-project', '/read', '/media'];

function localized(path, locale) {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

async function getPublishedArticles() {
  const articles = [];
  let cursorTime;
  let cursorId;
  for (let page = 0; page < 100; page += 1) {
    const params = new URLSearchParams({ limit: '50' });
    if (cursorTime && cursorId) {
      params.set('cursorTime', cursorTime);
      params.set('cursorId', cursorId);
    }
    const response = await fetch(`${apiBase}/public/articles?${params}`, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`public article index returned ${response.status}`);
    const payload = await response.json();
    articles.push(...(Array.isArray(payload.articles) ? payload.articles : []));
    if (!payload.hasMore || !payload.articles?.length) break;
    const last = payload.articles[payload.articles.length - 1];
    cursorTime = last.published_at;
    cursorId = last.id;
    if (!cursorTime || !cursorId) break;
  }
  return articles.filter((article) => typeof article.slug === 'string' && article.slug.length > 0);
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;' })[character]);
}

function localePath(path, locale) {
  if (path === '/') return `/${locale}`;
  if (path.startsWith('/fa/') || path.startsWith('/en/')) return path.replace(/^\/(fa|en)/, `/${locale}`);
  return `/${locale}${path}`;
}

function urlEntry(path, lastmod) {
  const isLocalized = path.startsWith('/fa') || path.startsWith('/en');
  const basePath = isLocalized ? path.replace(/^\/(fa|en)/, '') || '/' : path;
  const alternates = isLocalized || basePath === '/' || staticPaths.includes(basePath) || basePath.startsWith('/read/')
    ? `\n    <xhtml:link rel="alternate" hreflang="fa" href="${escapeXml(`${origin}${localePath(basePath, 'fa')}`)}" />\n    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${origin}${localePath(basePath, 'en')}`)}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}${basePath}`)}" />`
    : '';
  return `  <url>\n    <loc>${escapeXml(`${origin}${path}`)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>` : ''}${alternates}\n  </url>`;
}

async function main() {
  let articles = [];
  try {
    articles = await getPublishedArticles();
  } catch (error) {
    console.warn(`[seo] Could not fetch public articles; generating static sitemap only: ${error.message}`);
  }

  const paths = [];
  for (const path of staticPaths) {
    paths.push({ path, lastmod: undefined });
    paths.push({ path: localized(path, 'fa'), lastmod: undefined });
    paths.push({ path: localized(path, 'en'), lastmod: undefined });
  }
  for (const article of articles) {
    const lastmod = article.updated_at || article.published_at;
    paths.push({ path: `/read/${encodeURIComponent(article.slug)}`, lastmod });
    paths.push({ path: `/fa/read/${encodeURIComponent(article.slug)}`, lastmod });
    paths.push({ path: `/en/read/${encodeURIComponent(article.slug)}`, lastmod });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${paths.map(({ path, lastmod }) => urlEntry(path, lastmod)).join('\n')}\n</urlset>\n`;
  await mkdir('public', { recursive: true });
  await writeFile('public/sitemap.xml', sitemap, 'utf8');
  await writeFile('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /auth\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /complete-profile\nDisallow: /rewrite\nDisallow: /change-password\nDisallow: /live/new\nDisallow: /live/\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
  console.log(`[seo] Generated sitemap with ${paths.length} URLs (${articles.length} published articles).`);
}

await main();
process.exit(0);
