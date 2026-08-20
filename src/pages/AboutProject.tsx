import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FileText,
  Layers,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { setSeoMetadata } from '@/lib/seo';
import { PaperWindHero } from '@/components/creative/PaperWindHero';

type Icon = typeof FileText;

const trustItems = [
  { fa: 'مقالهٔ دوزبانهٔ فارسی / انگلیسی', en: 'Persian / English bilingual articles', icon: BookOpen },
  { fa: 'متن + Deck اسلایدی کوتاه', en: 'Text plus concise slide decks', icon: Layers },
  { fa: 'جلسهٔ زنده کنار مقاله', en: 'Live discussion beside the article', icon: Video },
  { fa: 'خواندن آزاد؛ نگارش با ورود', en: 'Open reading; sign-in for writing', icon: ShieldCheck },
];

const featureItems = [
  {
    faTitle: 'در چند دقیقه بفهم، در نیم ساعت نقد کن',
    enTitle: 'Understand in minutes, critique in half an hour',
    faBody: 'هر ایده در یک اسلاید مستقل می‌نشیند تا مرور، ارجاع و گفت‌وگو از دیوار متن سریع‌تر باشد.',
    enBody: 'Each idea has its own slide so review, citation and discussion move faster than a wall of text.',
    icon: Layers,
  },
  {
    faTitle: 'دوزبانگی بدون دوباره‌کاری',
    enTitle: 'Bilingual by design, not by duplication',
    faBody: 'ساختار فارسی و انگلیسی هم‌ارز است؛ عنوان، چکیده، متن و برچسب‌ها کنار هم نگهداری می‌شوند.',
    enBody: 'Persian and English remain equivalent structures, from title and abstract to body and tags.',
    icon: BookOpen,
  },
  {
    faTitle: 'گفت‌وگو بخشی از اثر می‌ماند',
    enTitle: 'Discussion becomes part of the work',
    faBody: 'جلسهٔ زنده ادامهٔ مقاله است؛ پرسش‌ها و اصلاح‌های پذیرفته می‌توانند به برگ افزودهٔ مقاله برگردند.',
    enBody: 'A live session extends the article, while accepted questions and revisions can return as an addendum.',
    icon: MessageCircle,
  },
  {
    faTitle: 'هوش مصنوعی، کمکی و قابل‌کنترل',
    enTitle: 'AI as an accountable assistant',
    faBody: 'بازنویسی و پیشنهادها اختیاری‌اند و مسئولیت صحت علمی همیشه با نویسنده باقی می‌ماند.',
    enBody: 'Rewriting and suggestions are optional; scientific responsibility always remains with the author.',
    icon: Sparkles,
  },
];

const audiences = [
  { faTitle: 'نویسنده و پژوهشگر', enTitle: 'Authors and researchers', faBody: 'ایدهٔ پخته را روشن منتشر می‌کند و همان‌جا بازخورد می‌گیرد.', enBody: 'Publish a mature idea clearly and receive feedback in the same place.', icon: FileText },
  { faTitle: 'دانشجو و خواننده', enTitle: 'Students and readers', faBody: 'فهم فشرده، مسیر مطالعه و دسترسی به گفت‌وگوی زنده را پیدا می‌کند.', enBody: 'Find compressed understanding, a study path and live discussion.', icon: Users },
  { faTitle: 'ویراستار و داور', enTitle: 'Editors and reviewers', faBody: 'نسخه‌ها، نقش‌ها و مسیر انتشار را شفاف و قابل بررسی می‌بیند.', enBody: 'Review versions, roles and publication flow with clarity.', icon: CheckCircle2 },
];

const faqs = [
  { faQ: 'آیا کاغذ و باد جایگزین ژورنال است؟', enQ: 'Does KaghazBaad replace journals?', faA: 'خیر. کاغذ و باد یک بستر مکمل برای انتشار روشن، مرور سریع و گفت‌وگوی پس از انتشار است.', enA: 'No. It complements journals with clear publishing, fast review and post-publication discussion.' },
  { faQ: 'معیار انتشار چیست؟', enQ: 'What is the publication standard?', faA: 'ارجاع‌پذیری، شفافیت ادعا، کیفیت ارائه و رعایت آداب انتشار؛ جزئیات داوری با نقش‌های ویرایشگر و مدیر کنترل می‌شود.', enA: 'Traceable references, clear claims, presentation quality and editorial standards; workflow is role-controlled.' },
  { faQ: 'مالکیت محتوا با کیست؟', enQ: 'Who owns the content?', faA: 'محتوا متعلق به پدیدآورنده است و پلتفرم فقط زیرساخت انتشار و گفت‌وگو را فراهم می‌کند.', enA: 'Content remains with its creator; the platform provides publishing and discussion infrastructure.' },
  { faQ: 'اگر فقط یک زبان آماده باشد چه؟', enQ: 'What if only one language is ready?', faA: 'انتشار تک‌زبانه ممکن است؛ با این حال نسخهٔ دوزبانه، معیار حرفه‌ای و مسیر پیشنهادی پروژه است.', enA: 'Single-language publishing is possible, while bilingual publication remains the preferred professional path.' },
  { faQ: 'آیا جلسهٔ زنده ضبط می‌شود؟', enQ: 'Are live sessions recorded?', faA: 'ضبط به تنظیمات جلسه و دسترسی میزبان وابسته است و بدون تصمیم آگاهانهٔ میزبان فعال نمی‌شود.', enA: 'Recording depends on session settings and host permissions; it is not enabled without an informed host decision.' },
  { faQ: 'مدل بازنویسی چه داده‌هایی می‌بیند؟', enQ: 'What data does the rewriting model see?', faA: 'فقط داده‌ای که برای همان درخواست انتخاب شده است؛ استفاده از AI اختیاری است و کنترل مصرف و دسترسی در backend انجام می‌شود.', enA: 'Only the data selected for that request; AI is optional, with usage and access controlled by the backend.' },
];

const technicalDetails = `### کالبد فنی

- **Frontend:** React 18، TypeScript، Vite، Tailwind CSS و رابط سازگار با فارسی و RTL.
- **Backend:** Node.js/Fastify مستقل روی Liara PaaS، PostgreSQL روی Liara DBaaS و Object Storage برای رسانه.
- **Live:** LiveKit Cloud با صدور token کوتاه‌عمر فقط از backend و کنترل نقش‌های میزبان، سخنران و بیننده.
- **Auth:** ورود ایمیلی و تلفنی، OAuth با Google/GitHub پس از تنظیم credentialهای provider، session داخلی و audit ورود.
- **RBAC:** مهمان، کاربر، نویسنده، ویرایشگر و مدیر؛ سطوح مدیریتی برای کنترل امنیت، محتوا، مصرف و انتشار.
- **AI:** gateway مصرف، attribution provider/model، quota، cache و ثبت token برای استفادهٔ اختیاری و قابل‌کنترل.

جزئیات اجرایی و مسیر توسعه در مستندات پروژه نگهداری می‌شود؛ این بخش عمداً برای مخاطب فنی در پایین صفحه قرار گرفته است.`;

function ButtonArrow({ rtl }: { rtl: boolean }) {
  return rtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />;
}

export default function AboutProject() {
  const { locale } = useLanguage();
  const isFa = locale === 'fa';
  const dir = isFa ? 'rtl' : 'ltr';
  const text = useCallback((fa: string, en: string) => (isFa ? fa : en), [isFa]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const pageTitle = text('شرح پروژه — کاغذ و باد', 'Project Description — KaghazBaad');
  const pageDesc = text(
    'کاغذ و باد؛ بستر نشر آکادمیک دوزبانه، اسلایدهای کوتاه و گفت‌وگوی زنده با نویسنده.',
    'KaghazBaad is a bilingual academic publishing platform for concise slides and live discussion.',
  );

  useEffect(() => {
    const pathname = window.location.pathname;
    const prefix = pathname.startsWith('/fa/') ? '/fa' : pathname.startsWith('/en/') ? '/en' : '';
    setSeoMetadata({
      title: pageTitle,
      description: pageDesc,
      canonicalPath: `${prefix}/about-project`,
      locale: isFa ? 'fa_IR' : 'en_US',
      language: isFa ? 'fa-IR' : 'en-US',
      structuredData: [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: isFa ? 'خانه' : 'Home', item: `https://kaghazobaad.ir${prefix || ''}/` },
            { '@type': 'ListItem', position: 2, name: isFa ? 'شرح پروژه' : 'Project Description' },
          ],
        },
        {
          '@type': 'FAQPage',
          '@id': `${window.location.origin}${prefix}/about-project#faq`,
          mainEntity: faqs.map(({ faQ, enQ, faA, enA }) => ({
            '@type': 'Question',
            name: text(faQ, enQ),
            acceptedAnswer: { '@type': 'Answer', text: text(faA, enA) },
          })),
        },
      ],
    });
  }, [isFa, pageTitle, pageDesc, text]);

  return (
    <main dir={dir} className="min-h-screen pb-16 bg-background">
      <section className="kb-hero relative overflow-hidden border-b border-border/60 py-14 md:py-20">
        <div className="container relative z-10 mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8">
          <div className="kb-hero-content text-center lg:text-start">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1.5 text-xs text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {text('شرح پروژه و نقشهٔ محصول', 'Project brief and product blueprint')}
            </div>
            <h1 className="font-[IRANSharp] text-4xl font-bold tracking-tight md:text-6xl">
              {text('دانشی که رها می‌شود تا پرواز کند', 'Knowledge released to take flight')}
            </h1>
            <p className="mt-4 text-xl font-semibold leading-9 text-foreground/85 md:text-2xl">
              {text('کاغذ · باد · بادبادک — نشر آکادمیک دوزبانه، با اسلایدهای کوتاه و کارگاه زنده', 'Paper · Wind · Kite — bilingual academic publishing with concise slides and live workshops')}
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground lg:mx-0">
              {text('مقاله را از یک فایل دفن‌شده در PDF به اثری قابل مرور، قابل گفت‌وگو و قابل ادامه تبدیل می‌کنیم.', 'We turn the buried PDF into work that can be scanned, discussed and extended.')}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {text('درخواست دعوت / شروع', 'Request an invite / Start')}
                <ButtonArrow rtl={isFa} />
              </Link>
              <Link to="/read" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 py-3 text-sm font-semibold transition hover:bg-accent/10">
                {text('دیدن نمونه مقاله', 'Explore articles')}
                <ButtonArrow rtl={isFa} />
              </Link>
            </div>
          </div>
          <div className="kb-hero-art glass-surface rounded-3xl border border-primary/15 p-6 shadow-soft md:p-8">
            <PaperWindHero reducedMotion={reducedMotion} />
            <div className="mb-5 flex items-center gap-3 text-primary"><Target className="h-6 w-6" /><span className="font-semibold">{text('چرخهٔ کوتاه‌تر فهم', 'A shorter path to understanding')}</span></div>
            <div className="space-y-4">
              {[
                ['۰۱', 'بنویس', 'Write', 'متن و چکیدهٔ روشن', 'Clear text and abstract'],
                ['۰۲', 'بساز', 'Build', 'هر ایده در یک اسلاید', 'One idea per slide'],
                ['۰۳', 'زنده کن', 'Make it live', 'پرسش، پاسخ و برگ افزوده', 'Questions, answers and addenda'],
              ].map(([number, fa, en, faSub, enSub]) => (
                <div key={number} className="kb-step-card flex items-center gap-4 rounded-2xl p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{number}</span>
                  <div><p className="font-semibold">{text(fa, en)}</p><p className="mt-1 text-sm text-muted-foreground">{text(faSub, enSub)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-background/70 py-6">
        <div className="container mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trustItems.map(({ fa, en, icon: Icon }) => <div key={en} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" />{text(fa, en)}</div>)}
        </div>
      </section>

      <div className="container mx-auto max-w-6xl space-y-16 px-4 pt-14 lg:px-8">
        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/60 p-7"><p className="mb-3 text-sm font-semibold text-primary">{text('مسئله', 'The problem')}</p><h2 className="font-[IRANSharp] text-2xl font-bold">{text('محتوای علمی اغلب یا طولانی و کند است، یا از گفت‌وگو جدا می‌ماند.', 'Academic work is often slow to read and disconnected from discussion.')}</h2><ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">{['خواندن طولانی و بدون مرور سریع', 'پراکنده‌بودن گفت‌وگو میان کامنت، شبکهٔ اجتماعی و جلسه', 'فاصلهٔ زیاد میان انتشار، فهم و بازخورد'].map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{text(item, ['Long reading with no quick overview', 'Discussion scattered across comments, social media and meetings', 'A wide gap between publishing, understanding and feedback'][['خواندن طولانی و بدون مرور سریع', 'پراکنده‌بودن گفت‌وگو میان کامنت، شبکهٔ اجتماعی و جلسه', 'فاصلهٔ زیاد میان انتشار، فهم و بازخورد'].indexOf(item)])}</li>)}</ul></div>
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-7"><p className="mb-3 text-sm font-semibold text-primary">{text('راه‌حل', 'The solution')}</p><h2 className="font-[IRANSharp] text-2xl font-bold">{text('کاغذ و باد مقاله را به یک تجربهٔ کاملِ نشر، مرور و گفت‌وگو تبدیل می‌کند.', 'KaghazBaad turns an article into a complete publishing, review and discussion experience.')}</h2><ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">{['Deck اسلایدی برای مرور سریع و نقدپذیر', 'جلسهٔ زنده به‌عنوان پیوست مقاله، نه رویدادی جدا', 'دوزبانگی هم‌سطح برای فارسی و انگلیسی'].map((item, index) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />{text(item, ['A slide deck for quick review and critique', 'A live session as an article addendum, not a separate event', 'Equal bilingual structure for Persian and English'][index])}</li>)}</ul></div>
        </section>

        <section><div className="mb-8 text-center"><p className="text-sm font-semibold text-primary">{text('چطور کار می‌کند؟', 'How it works')}</p><h2 className="mt-2 font-[IRANSharp] text-3xl font-bold">{text('سه گام از ایده تا گفت‌وگو', 'Three steps from idea to discussion')}</h2></div><div className="grid gap-5 md:grid-cols-3">{[['۰۱', 'بنویس', 'Write', 'متن، چکیده و برچسب‌ها را در دو زبان آماده کن.', 'Prepare text, abstract and tags in both languages.'], ['۰۲', 'بساز', 'Build', 'هر اسلاید را به یک ادعا و دلیل روشن اختصاص بده.', 'Give each slide one clear claim and reason.'], ['۰۳', 'زنده کن', 'Make it live', 'کارگاه پرسش‌وپاسخ را برگزار کن و خروجی را به مقاله برگردان.', 'Host a Q&A workshop and return its output to the article.']].map(([number, faTitle, enTitle, faBody, enBody]) => <div key={number} className="kb-step-card rounded-2xl p-6"><span className="text-sm font-bold text-primary">{number}</span><h3 className="mt-4 text-xl font-bold">{text(faTitle, enTitle)}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text(faBody, enBody)}</p></div>)}</div></section>

        <section><div className="mb-8"><p className="text-sm font-semibold text-primary">{text('مزیت‌ها', 'Benefits')}</p><h2 className="mt-2 font-[IRANSharp] text-3xl font-bold">{text('نتیجه برای کاربر، نه فهرست فیچرها', 'Outcomes, not a feature list')}</h2></div><div className="grid gap-5 sm:grid-cols-2">{featureItems.map(({ faTitle, enTitle, faBody, enBody, icon: Icon }) => <div key={enTitle} className="kb-step-card rounded-2xl p-6"><Icon className="h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-bold">{text(faTitle, enTitle)}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text(faBody, enBody)}</p></div>)}</div></section>

        <section><div className="mb-8 text-center"><p className="text-sm font-semibold text-primary">{text('برای چه کسانی؟', 'For whom?')}</p><h2 className="mt-2 font-[IRANSharp] text-3xl font-bold">{text('یک فضای کوچک برای پیوندهای باکیفیت', 'A small space for high-quality connections')}</h2></div><div className="grid gap-5 md:grid-cols-3">{audiences.map(({ faTitle, enTitle, faBody, enBody, icon: Icon }) => <div key={enTitle} className="rounded-2xl border border-border/70 p-6 text-center"><Icon className="mx-auto h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">{text(faTitle, enTitle)}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text(faBody, enBody)}</p></div>)}</div></section>

        <section><div className="mb-8"><p className="text-sm font-semibold text-primary">FAQ</p><h2 className="mt-2 font-[IRANSharp] text-3xl font-bold">{text('پرسش‌های مهم پیش از ورود', 'Questions worth answering before joining')}</h2></div><div className="grid gap-3 md:grid-cols-2">{faqs.map(({ faQ, enQ, faA, enA }) => <details key={enQ} className="group rounded-2xl border border-border/70 bg-card/40 p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"><span>{text(faQ, enQ)}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" /></summary><p className="mt-4 text-sm leading-7 text-muted-foreground">{text(faA, enA)}</p></details>)}</div></section>

        <section className="rounded-3xl border border-border/70 bg-muted/20 p-5"><details><summary className="flex cursor-pointer list-none items-center gap-3 font-semibold"><Cpu className="h-5 w-5 text-primary" />{text('جزئیات فنی برای توسعه‌دهندگان', 'Technical details for developers')}<ChevronDown className="ms-auto h-4 w-4 text-muted-foreground transition group-open:rotate-180" /></summary><div className="prose prose-sm mt-6 max-w-none dark:prose-invert"><ReactMarkdown>{technicalDetails}</ReactMarkdown></div></details></section>

        <section className="rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground md:px-12"><h2 className="font-[IRANSharp] text-3xl font-bold">{text('مقاله‌ای بسازید که واقعاً خوانده و وارد گفت‌وگو شود.', 'Publish work that is actually read and enters the conversation.')}</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-primary-foreground/80">{text('کاغذ می‌ماند؛ باد می‌وزد؛ فهم میان این دو ادامه پیدا می‌کند.', 'Paper remains; wind moves; understanding continues between the two.')}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background/90">{text('شروع کنید', 'Get started')}<ButtonArrow rtl={isFa} /></Link><Link to="/read" className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/30 px-5 py-3 text-sm font-semibold transition hover:bg-primary-foreground/10">{text('دیدن نمونه‌ها', 'See examples')}<ButtonArrow rtl={isFa} /></Link></div></section>

        <footer className="pb-4 text-center text-xs text-muted-foreground">{text('آخرین ویرایش: مرداد ۱۴۰۵ — شرح محصول و نقشهٔ پروژه', 'Last updated: August 2026 — Product brief and project blueprint')}</footer>
      </div>
    </main>
  );
}
