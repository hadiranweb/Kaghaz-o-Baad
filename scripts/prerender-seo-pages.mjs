import { mkdir, readFile, writeFile } from 'node:fs/promises';

const origin = 'https://kaghazobaad.ir';
const apiBase = (process.env.SEO_PUBLIC_API_URL || process.env.VITE_API_URL || 'https://api.kaghazobaad.ir/api/v1').replace(/\/$/, '');
const baseHtml = await readFile('dist/index.html', 'utf8');

function normalizePath(path) {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character]);
}
function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
function localizedPath(path, locale) {
  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}
function headFor({ path, title, description, locale = 'fa_IR', type = 'website', image, structuredData }) {
  const normalizedPath = normalizePath(path);
  const canonical = `${origin}${normalizedPath}`;
  const alternateLocale = locale === 'fa_IR' ? 'en_US' : 'fa_IR';
  const language = locale === 'fa_IR' ? 'fa-IR' : 'en-US';
  const imageUrl = image || `${origin}/brain-character.svg`;
  const graph = structuredData ? [
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      inLanguage: language,
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': `${origin}/#organization` },
    },
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'کاغذ و باد | KaghazBaad', url: origin, logo: `${origin}/brain-character.svg` },
    { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'کاغذ و باد | KaghazBaad', url: origin, inLanguage: language },
    ...structuredData,
  ] : undefined;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="enamad" content="9539854" />`,
    `<meta name="robots" content="index,follow,max-image-preview:large" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<link rel="alternate" hreflang="fa" href="${escapeHtml(`${origin}${normalizePath(localizedPath(normalizedPath.replace(/^\/(fa|en)/, '') || '/', 'fa'))}`)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(`${origin}${normalizePath(localizedPath(normalizedPath.replace(/^\/(fa|en)/, '') || '/', 'en'))}`)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}${normalizePath(normalizedPath.replace(/^\/(fa|en)/, '') || '/')}`)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:site_name" content="کاغذ و باد | KaghazBaad" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta property="og:locale:alternate" content="${alternateLocale}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:image:alt" content="نشان کاغذ و باد | KaghazBaad mark" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    graph ? `<script id="kaghazbaad-seo-structured-data" type="application/ld+json">${escapeJson({ '@context': 'https://schema.org', '@graph': graph })}</script>` : '',
  ].filter(Boolean).join('\n    ');
  return baseHtml.replace(/<head>/i, `<head>\n    ${tags}`);
}

async function fetchArticles() {
  try {
    const response = await fetch(`${apiBase}/public/articles?limit=50`, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.articles) ? payload.articles : [];
  } catch {
    return [];
  }
}

const projectFaqs = [
  ['آیا کاغذ و باد جایگزین ژورنال است؟', 'خیر. کاغذ و باد یک بستر مکمل برای انتشار روشن، مرور سریع و گفت‌وگوی پس از انتشار است.'],
  ['معیار انتشار چیست؟', 'ارجاع‌پذیری، شفافیت ادعا، کیفیت ارائه و رعایت آداب انتشار؛ جزئیات داوری با نقش‌های ویرایشگر و مدیر کنترل می‌شود.'],
  ['مالکیت محتوا با کیست؟', 'محتوا متعلق به پدیدآورنده است و پلتفرم فقط زیرساخت انتشار و گفت‌وگو را فراهم می‌کند.'],
  ['اگر فقط یک زبان آماده باشد چه؟', 'انتشار تک‌زبانه ممکن است؛ نسخهٔ دوزبانه مسیر پیشنهادی پروژه است.'],
  ['آیا جلسهٔ زنده ضبط می‌شود؟', 'ضبط به تنظیمات جلسه و دسترسی میزبان وابسته است و بدون تصمیم آگاهانهٔ میزبان فعال نمی‌شود.'],
  ['مدل بازنویسی چه داده‌هایی می‌بیند؟', 'فقط داده‌ای که برای همان درخواست انتخاب شده است؛ استفاده از AI اختیاری و کنترل مصرف در backend انجام می‌شود.'],
].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }));

const pages = [
  { path: '/', fa: ['کاغذ و باد | پلتفرم نشر آکادمیک', 'پلتفرم دوزبانهٔ نشر آکادمیک، اسلایدهای کوتاه و گفت‌وگوی زنده با نویسنده.'], en: ['KaghazBaad | Academic publishing platform', 'A bilingual academic publishing platform for concise works and live discussion.'] },
  { path: '/about', fa: ['دربارهٔ کاغذ و باد', 'آشنایی با بستر دوزبانهٔ نشر آکادمیک و گفت‌وگوی پس از انتشار.'], en: ['About KaghazBaad', 'Learn about the bilingual academic publishing and post-publication discussion platform.'] },
  { path: '/about-project', fa: ['شرح پروژه — کاغذ و باد', 'کاغذ و باد؛ بستر نشر آکادمیک دوزبانه، اسلایدهای کوتاه و گفت‌وگوی زنده با نویسنده.'], en: ['Project Description — KaghazBaad', 'KaghazBaad is a bilingual academic publishing platform for concise slides and live discussion.'] },
  { path: '/contact', fa: ['تماس با ما — کاغذ و باد', 'راه‌های ارتباط با تیم کاغذ و باد برای همکاری، پشتیبانی و درخواست دسترسی.'], en: ['Contact — KaghazBaad', 'Contact KaghazBaad for collaboration, support and access requests.'] },
  { path: '/read', fa: ['مقالات — کاغذ و باد', 'مقالات آکادمیک دوزبانه را بخوانید و وارد گفت‌وگوی پیرامون آن‌ها شوید.'], en: ['Read — KaghazBaad', 'Read bilingual academic articles and join the conversation around them.'] },
  { path: '/media', fa: ['رسانه — کاغذ و باد', 'رسانه‌ها و ارائه‌های مرتبط با آثار منتشرشده در کاغذ و باد.'], en: ['Media — KaghazBaad', 'Media and presentations connected to works published on KaghazBaad.'] },
];

async function writeRoute(path, html) {
  const target = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true });
  await writeFile(target, html, 'utf8');
}

for (const page of pages) {
  const faStructuredData = [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'خانه', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: page.fa[0] }] }];
  if (page.path === '/about-project') faStructuredData.push({ '@type': 'FAQPage', '@id': `${origin}/about-project#faq`, mainEntity: projectFaqs });
  await writeRoute(page.path, headFor({ path: page.path, title: page.fa[0], description: page.fa[1], locale: 'fa_IR', structuredData: faStructuredData }));
  const faLocalizedStructuredData = [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'خانه', item: `${origin}/fa` }, { '@type': 'ListItem', position: 2, name: page.fa[0] }] }];
  if (page.path === '/about-project') faLocalizedStructuredData.push({ '@type': 'FAQPage', '@id': `${origin}/fa/about-project#faq`, mainEntity: projectFaqs });
  await writeRoute(localizedPath(page.path, 'fa'), headFor({ path: localizedPath(page.path, 'fa'), title: page.fa[0], description: page.fa[1], locale: 'fa_IR', structuredData: faLocalizedStructuredData }));
  const enStructuredData = [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/en` }, { '@type': 'ListItem', position: 2, name: page.en[0] }] }];
  if (page.path === '/about-project') enStructuredData.push({ '@type': 'FAQPage', '@id': `${origin}/en/about-project#faq`, mainEntity: projectFaqs });
  await writeRoute(localizedPath(page.path, 'en'), headFor({ path: localizedPath(page.path, 'en'), title: page.en[0], description: page.en[1], locale: 'en_US', structuredData: enStructuredData }));
}

const articles = await fetchArticles();
for (const article of articles) {
  if (!article.slug) continue;
  const slug = encodeURIComponent(article.slug);
  const faTitle = article.title_fa || article.title_en || article.slug;
  const enTitle = article.title_en || article.title_fa || article.slug;
  const faDescription = article.summary_fa || article.summary_en || faTitle;
  const enDescription = article.summary_en || article.summary_fa || enTitle;
  const articleSchema = (title, description, path) => ({ '@type': 'Article', '@id': `${origin}${path}#article`, headline: title, description, mainEntityOfPage: { '@id': `${origin}${path}#webpage` }, author: { '@type': 'Organization', name: 'کاغذ و باد', url: origin }, publisher: { '@type': 'Organization', name: 'کاغذ و باد', url: origin }, datePublished: article.published_at || undefined, dateModified: article.updated_at || article.published_at || undefined, image: article.cover_url ? [article.cover_url] : [`${origin}/brain-character.svg`] });
  for (const [path, title, description, locale] of [[`/read/${slug}`, faTitle, faDescription, 'fa_IR'], [`/fa/read/${slug}`, faTitle, faDescription, 'fa_IR'], [`/en/read/${slug}`, enTitle, enDescription, 'en_US']]) {
    await writeRoute(path, headFor({ path, title: `${title} — کاغذ و باد`, description, locale, type: 'article', image: article.cover_url || undefined, structuredData: [articleSchema(title, description, path)] }));
  }
}
console.log(`[seo] Prerendered ${pages.length * 3} public route documents and ${articles.length} article records.`);
