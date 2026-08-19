export type SeoIndexing = 'index' | 'noindex';

export type SeoRoutePolicy = {
  pattern: string;
  indexing: SeoIndexing;
  follow: boolean;
  public: boolean;
  reason: string;
};

export const SITE_ORIGIN = 'https://kaghazobaad.ir';
export const SITE_NAME = 'کاغذ و باد | KaghazBaad';
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/brain-character.svg`;

export const SEO_ROUTE_POLICIES: SeoRoutePolicy[] = [
  { pattern: '/', indexing: 'index', follow: true, public: true, reason: 'public homepage' },
  { pattern: '/about', indexing: 'index', follow: true, public: true, reason: 'public introduction' },
  { pattern: '/about-project', indexing: 'index', follow: true, public: true, reason: 'public project blueprint' },
  { pattern: '/read', indexing: 'index', follow: true, public: true, reason: 'public article hub' },
  { pattern: '/read/:slug', indexing: 'index', follow: true, public: true, reason: 'published article only' },
  { pattern: '/media', indexing: 'index', follow: true, public: true, reason: 'public media hub when content is available' },
  { pattern: '/community', indexing: 'noindex', follow: true, public: false, reason: 'user/community surface requires content policy review' },
  { pattern: '/live', indexing: 'noindex', follow: true, public: false, reason: 'session directory requires public event policy' },
  { pattern: '/live/:id', indexing: 'noindex', follow: false, public: false, reason: 'live room is operational/private' },
  { pattern: '/auth', indexing: 'noindex', follow: false, public: false, reason: 'authentication operation' },
  { pattern: '/dashboard', indexing: 'noindex', follow: false, public: false, reason: 'authenticated workspace' },
  { pattern: '/admin', indexing: 'noindex', follow: false, public: false, reason: 'administration surface' },
  { pattern: '/complete-profile', indexing: 'noindex', follow: false, public: false, reason: 'account operation' },
  { pattern: '/rewrite', indexing: 'noindex', follow: false, public: false, reason: 'private AI tool' },
  { pattern: '/live/new', indexing: 'noindex', follow: false, public: false, reason: 'authenticated session creation' },
  { pattern: '/change-password', indexing: 'noindex', follow: false, public: false, reason: 'account operation' },
];

export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  locale?: 'fa_IR' | 'en_US';
  language?: 'fa-IR' | 'en-US';
  indexing?: SeoIndexing;
  follow?: boolean;
  image?: string;
  type?: 'website' | 'article';
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, extra: Record<string, string> = {}) {
  const selector = Object.keys(extra).length
    ? `link[rel="${rel}"][${Object.keys(extra).map((key) => `${key}="${extra[key]}"`).join('][')}]`
    : `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    Object.entries(extra).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function setSeoMetadata(metadata: SeoMetadata) {
  const canonicalUrl = new URL(metadata.canonicalPath, SITE_ORIGIN).toString();
  const imageUrl = metadata.image ?? DEFAULT_SOCIAL_IMAGE;
  const indexing = metadata.indexing ?? 'index';
  const follow = metadata.follow ?? true;
  const robots = `${indexing},${follow ? 'follow' : 'nofollow'},max-image-preview:large`;
  const locale = metadata.locale ?? 'fa_IR';
  const alternateLocale = locale === 'fa_IR' ? 'en_US' : 'fa_IR';
  const language = metadata.language ?? (locale === 'fa_IR' ? 'fa-IR' : 'en-US');

  document.title = metadata.title;
  upsertMeta('meta[name="description"]', { name: 'description' }, metadata.description);
  upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, metadata.title);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, metadata.description);
  upsertMeta('meta[property="og:type"]', { property: 'og:type' }, metadata.type ?? 'website');
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, locale);
  upsertMeta('meta[property="og:locale:alternate"]', { property: 'og:locale:alternate' }, alternateLocale);
  upsertMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, 'نشان کاغذ و باد | KaghazBaad mark');
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, metadata.title);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, metadata.description);
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);
  upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt' }, 'نشان کاغذ و باد | KaghazBaad mark');
  upsertLink('canonical', canonicalUrl);
  upsertLink('alternate', `${SITE_ORIGIN}/fa${metadata.canonicalPath}`, { hreflang: 'fa' });
  upsertLink('alternate', `${SITE_ORIGIN}/en${metadata.canonicalPath}`, { hreflang: 'en' });
  upsertLink('alternate', `${SITE_ORIGIN}${metadata.canonicalPath}`, { hreflang: 'x-default' });

  const structuredDataId = 'kaghazbaad-seo-structured-data';
  document.getElementById(structuredDataId)?.remove();
  if (metadata.structuredData) {
    const script = document.createElement('script');
    script.id = structuredDataId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: metadata.title,
          description: metadata.description,
          inLanguage: language,
          isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
          about: { '@id': `${SITE_ORIGIN}/#organization` },
        },
        {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: SITE_NAME,
          url: SITE_ORIGIN,
          logo: DEFAULT_SOCIAL_IMAGE,
        },
        { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: SITE_NAME, url: SITE_ORIGIN, inLanguage: language },
        ...(Array.isArray(metadata.structuredData) ? metadata.structuredData : [metadata.structuredData]),
      ],
    });
    document.head.appendChild(script);
  }

  return () => document.getElementById(structuredDataId)?.remove();
}

export function setNoIndexMetadata() {
  return setSeoMetadata({
    title: 'کاغذ و باد | KaghazBaad',
    description: 'محیط خصوصی کاغذ و باد.',
    canonicalPath: window.location.pathname,
    indexing: 'noindex',
    follow: false,
  });
}
