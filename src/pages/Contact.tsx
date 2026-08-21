import { useEffect } from 'react';
import { Mail, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { setSeoMetadata } from '@/lib/seo';

export default function Contact() {
  const { locale } = useLanguage();
  const isFa = locale === 'fa';
  const dir = isFa ? 'rtl' : 'ltr';
  const text = (fa: string, en: string) => (isFa ? fa : en);

  useEffect(() => {
    setSeoMetadata({
      title: text('تماس با ما — کاغذ و باد', 'Contact — KaghazBaad'),
      description: text(
        'راه‌های ارتباط با تیم کاغذ و باد برای همکاری، پشتیبانی و درخواست دسترسی.',
        'Contact KaghazBaad for collaboration, support and access requests.',
      ),
      canonicalPath: `${window.location.pathname.replace(/\/$/, '') || '/contact'}`,
      locale: isFa ? 'fa_IR' : 'en_US',
      language: isFa ? 'fa-IR' : 'en-US',
      structuredData: [
        {
          '@type': 'ContactPage',
          mainEntity: {
            '@type': 'Organization',
            name: 'کاغذ و باد | KaghazBaad',
            url: 'https://kaghazobaad.ir',
            email: 'mailto:hadiranweb@kaghazobaad.ir',
          },
        },
      ],
    });
  }, [isFa]);

  const Arrow = isFa ? ArrowLeft : ArrowRight;

  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold text-primary">{text('ارتباط با کاغذ و باد', 'Connect with KaghazBaad')}</p>
          <h1 className="font-[IRANSharp] text-4xl font-bold tracking-tight md:text-5xl">
            {text('تماس با ما', 'Contact us')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            {text(
              'برای پشتیبانی، همکاری پژوهشی، درخواست دسترسی یا پرسش دربارهٔ انتشار مقاله با ما در تماس باشید.',
              'Contact us for support, research collaboration, access requests or questions about publishing an article.',
            )}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-border/70 bg-card/60 p-7 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold">{text('ایمیل مدیریت پلتفرم', 'Platform management email')}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {text('برای امور فنی، همکاری و پیگیری درخواست‌ها از این نشانی استفاده کنید.', 'Use this address for technical matters, collaboration and request follow-up.')}
            </p>
            <a
              className="mt-5 inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
              href="mailto:hadiranweb@kaghazobaad.ir"
              dir="ltr"
            >
              hadiranweb@kaghazobaad.ir
              <Arrow className="h-4 w-4" aria-hidden="true" />
            </a>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/60 p-7 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold">{text('موضوعات قابل پیگیری', 'Topics we can help with')}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              <li>{text('پشتیبانی ورود و احراز هویت', 'Sign-in and authentication support')}</li>
              <li>{text('درخواست دسترسی برای نویسندگان و پژوهشگران', 'Access requests for authors and researchers')}</li>
              <li>{text('همکاری دربارهٔ مقاله، اسلاید و جلسهٔ زنده', 'Article, slide and live-session collaboration')}</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/about-project" className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-accent/10">
            {text('شرح پروژه', 'Project description')}
            <Arrow className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5">
            {text('بازگشت به خانه', 'Back home')}
            <Arrow className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
