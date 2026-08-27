import { readFile } from 'node:fs/promises';
const requiredFiles = [
  ['dist/index.html', ['rel="canonical"', 'og:url', 'application/ld+json', 'home-prerender-title', 'کاغذ و باد؛ نشر آکادمیک دوزبانه و گفت‌وگوی پس از انتشار', 'href="/fa/read"', 'از انتشار مقاله تا گفت‌وگوی ادامه‌دار']],
  ['dist/fa/index.html', ['home-prerender-discovery', 'مرور مقالات پژوهشی منتشرشده', 'href="/fa/about-project"']],
  ['dist/en/index.html', ['home-prerender-title', 'KaghazBaad: bilingual academic publishing and post-publication dialogue', 'Explore published research articles', 'href="/en/read"']],
  ['dist/about-project/index.html', ['شرح پروژه', 'about-project', 'FAQPage', 'BreadcrumbList']],
  ['dist/fa/about-project/index.html', ['fa/about-project', 'FAQPage']],
  ['dist/en/about-project/index.html', ['en/about-project', 'FAQPage']],
  ['dist/robots.txt', ['Disallow: /dashboard', 'Disallow: /api/', 'Sitemap: https://kaghazobaad.ir/sitemap.xml']],
  ['dist/sitemap.xml', ['<urlset', 'hreflang="fa"', 'hreflang="en"', 'x-default']],
];

for (const [file, markers] of requiredFiles) {
  const content = await readFile(file, 'utf8');
  const missing = markers.filter((marker) => !content.includes(marker));
  if (missing.length) throw new Error(`${file} missing: ${missing.join(', ')}`);
  console.log(`[seo] verified ${file}`);
}
console.log('[seo] build verification passed');
