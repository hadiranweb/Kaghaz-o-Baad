import { ReactNode, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { setSeoMetadata } from '@/lib/seo';

type PublicPage = 'home' | 'about' | 'read' | 'media' | 'contact';

const copy: Record<PublicPage, { fa: [string, string]; en: [string, string] }> = {
  home: {
    fa: ['کاغذ و باد | پلتفرم نشر آکادمیک', 'پلتفرم دوزبانهٔ نشر آکادمیک، اسلایدهای کوتاه و گفت‌وگوی زنده با نویسنده.'],
    en: ['KaghazBaad | Academic publishing platform', 'A bilingual academic publishing platform for concise works and live discussion.'],
  },
  about: {
    fa: ['دربارهٔ کاغذ و باد', 'آشنایی با بستر دوزبانهٔ نشر آکادمیک و گفت‌وگوی پس از انتشار.'],
    en: ['About KaghazBaad', 'Learn about the bilingual academic publishing and post-publication discussion platform.'],
  },
  read: {
    fa: ['مقالات — کاغذ و باد', 'مقالات آکادمیک دوزبانه را بخوانید و وارد گفت‌وگوی پیرامون آن‌ها شوید.'],
    en: ['Read — KaghazBaad', 'Read bilingual academic articles and join the conversation around them.'],
  },
  media: {
    fa: ['رسانه — کاغذ و باد', 'رسانه‌ها و ارائه‌های مرتبط با آثار منتشرشده در کاغذ و باد.'],
    en: ['Media — KaghazBaad', 'Media and presentations connected to works published on KaghazBaad.'],
  },
  contact: {
    fa: ['تماس با ما — کاغذ و باد', 'راه‌های ارتباط با تیم کاغذ و باد برای همکاری، پشتیبانی و درخواست دسترسی.'],
    en: ['Contact — KaghazBaad', 'Contact KaghazBaad for collaboration, support and access requests.'],
  },
};

export function PublicSeoRoute({ page, children }: { page: PublicPage; children: ReactNode }) {
  const { locale } = useLanguage();
  useEffect(() => {
    const prefix = window.location.pathname.startsWith('/fa') ? '/fa' : window.location.pathname.startsWith('/en') ? '/en' : '';
    const [title, description] = copy[page][locale];
    setSeoMetadata({ title, description, canonicalPath: `${prefix}${page === 'home' ? '' : `/${page === 'read' ? 'read' : page}`}` || '/', locale: locale === 'fa' ? 'fa_IR' : 'en_US', language: locale === 'fa' ? 'fa-IR' : 'en-US', structuredData: [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: locale === 'fa' ? 'خانه' : 'Home', item: `https://kaghazobaad.ir${prefix || ''}/` }, { '@type': 'ListItem', position: 2, name: title }] }] });
  }, [locale, page]);
  return <>{children}</>;
}
