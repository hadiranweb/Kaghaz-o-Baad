import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BookOpen, Target, Users, Layers, Cpu, ScrollText, Eye } from 'lucide-react';

type Section = {
  id: string;
  section_key: string;
  title_en: string;
  title_fa: string;
  body_en: string;
  body_fa: string;
  order_num: number;
};

// ——— شرح ادبی و دسته‌بندی‌شده — تنها منبعی که هم انسان و هم مدل زبانی برای فهم پروژه به آن مراجعه می‌کند
const FALLBACK_SECTIONS: Section[] = [
  {
    id: '01',
    section_key: 'identity',
    order_num: 1,
    title_fa: '۱ — شناسنامه',
    title_en: '01 — Identity',
    body_fa: `**کاغذ و باد** پلتفرمی مستقل، دوزبانه (فارسی/انگلیسی) و متمرکز بر نشر آکادمیک در حوزه‌ی علوم شناختی، روان‌شناسی و مطالعات میان‌رشته‌ای است. نسخه‌ی حاضر (۱٫۰) چرخه‌ی کامل «نگارش → داوری → انتشار اسلایدی → گفت‌وگوی زنده» را پوشش می‌دهد.

- **نام ثبت‌شده:** کاغذ و باد — KaghazBaad
- **دامنه پیشنهادی:** kaghazbaad.ir
- **وضعیت:** بهره‌برداری محدود، دسترسی دعوت‌محور
- **زبان‌ها:** فارسی (پیش‌فرض، راست‌به‌چپ)، انگلیسی (چپ‌به‌راست) — تمام محتوا دو زبانه است
- **دسترسی:** خواندن آزاد؛ نگارش و جلسه با ورود`,
    body_en: `**KaghazBaad** is an independent, bilingual (Persian/English) platform focused on academic publishing in cognitive science, psychology and interdisciplinary studies. Version 1.0 covers the full loop “write → review → slide publication → live discussion”.

- **Registered name:** KaghazBaad — کاغذ و باد
- **Suggested domain:** kaghazbaad.ir
- **Status:** Limited production, invite-based access
- **Languages:** Persian (default, RTL), English (LTR) — all content is bilingual
- **Access:** Reading is public; writing and live sessions require sign-in`,
  },
  {
    id: '02',
    section_key: 'naming',
    order_num: 2,
    title_fa: '۲ — چرا کاغذ و باد',
    title_en: '02 — Why “Paper and Wind”',
    body_fa: `> کاغذ، حاملِ ضبط‌شده‌ی اندیشه است؛ باد، حاملِ زنده‌ی آن.

**کاغذ** استعاره‌ی داده‌ی ماندگار است: مقاله، اسلاید، ارجاع، و سندی که می‌ماند. **باد** استعاره‌ی محیطِ جاریِ فهم است: کلاسِ زنده، پرسشِ بی‌درنگ، و اصلاحِ جمعی. این دو در فارسی هم‌نشینِ شاعرانه‌اند و در انگلیسی نیز با همین وضوح ترجمه می‌شوند — *Paper and Wind*.

نام، تعهدی زیباشناختی نیز می‌گذارد: همان‌قدر که کاغذ باید سفید و خوانا بماند، متن باید بی‌پیرایه و دقیق باشد؛ همان‌قدر که باد باید بوزد، گفت‌وگو باید جاری باشد.`,
    body_en: `> Paper is the recorded carrier of thought; wind is its living carrier.

**Paper** stands for durable data — article, slides, references, the document that remains. **Wind** stands for the live medium of understanding — the live class, the immediate question, the collective revision. The pair is poetic in Persian and translates with the same clarity into English.

The name is also an aesthetic commitment: as paper must stay white and legible, text must stay spare and precise; as wind must blow, discussion must stay in motion.`,
  },
  {
    id: '03',
    section_key: 'mission',
    order_num: 3,
    title_fa: '۳ — مأموریت',
    title_en: '03 — Mission',
    body_fa: `ما برای «انتشارِ بیشتر» نیامده‌ایم؛ برای **انتشارِ دقیق‌تر** آمده‌ایم.

1. **ایجازِ مستدل:** هر مقاله در قالب اسلایدهای کوتاهِ ۱-ایده-در-۱-اسلاید منتشر می‌شود تا خواندن، مرور و نقد، سریع و دقیق باشد.
2. **دوزبانگیِ واقعی:** فارسی و انگلیسی دو روایتِ جدا نیستند؛ یک متن‌اند با دو کالبد زبانی هم‌ارز. عنوان، چکیده، بدنه و حتی برچسب‌ها در هر دو زبان نگهداری می‌شوند.
3. **زنده‌بودن پس از انتشار:** انتشار پایان نیست؛ آغازِ جلسه‌ی زنده است. نویسنده می‌تواند بلافاصله وارد اتاقِ گفت‌وگو شود و مقاله‌اش را با صدا و تصویر تشریح کند.

این سه اصل، معیارِ پذیرش یا ردِ هر ویژگیِ جدید است: اگر به ایجاز، دوزبانگی یا زنده‌بودن کمک نکند، افزوده نمی‌شود.`,
    body_en: `We are not here to “publish more”; we are here to **publish more precisely**.

1. **Reasoned brevity:** Each article is published as short 1-idea-per-slide decks — fast to read, review and critique.
2. **True bilinguality:** Persian and English are not two separate stories; they are one text with two linguistic bodies. Title, abstract, body and even tags are kept in both languages.
3. **Alive after publication:** Publication is not the end; it is the start of a live session. The author can enter a room and expound the article with voice and video.

These three principles decide every new feature: if it does not serve brevity, bilinguality or liveness, it is not added.`,
  },
  {
    id: '04',
    section_key: 'audience',
    order_num: 4,
    title_fa: '۴ — برای چه کسانی',
    title_en: '04 — Audience',
    body_fa: `| گروه | چه می‌خواهد | چه می‌یابد |
|---|---|---|
| **پژوهشگرِ نویسنده** | انتشارِ سریعِ ایده‌ی پخته، بدون دیوان‌سالاریِ مجله | ویرایشگرِ اسلاید، پیش‌نمایشِ زنده، و اتاقِ گفت‌وگو |
| **خواننده‌ی متخصص** | فهمِ فشرده در کم‌ترین زمان | اسلایدهای ۶۰-ثانیه‌ای، ارجاعِ تمیز، و جست‌وجوی پیشنهادده |
| **دانشجو** | دیدنِ فکر در حالِ ساخته‌شدن | بازنویسیِ هوشمند با لحنِ قابلِ انتخاب و جلساتِ باز |
| **داور / ویرایشگر** | تمرکز بر محتوا و داوریِ همتا | دسترسیِ نقش‌مند (editor/contributor) و مدیریت تاریخچه‌ی نسخه‌ها |

پلتفرم در آغاز، **اجتماعی کوچک و دعوت‌محور** است؛ کیفیتِ پیوندها بر کمیتِ اعضا ترجیح دارد.`,
    body_en: `| Group | Wants | Finds |
|---|---|---|
| **Author-researcher** | Fast publication of a mature idea, without journal bureaucracy | Slide editor, live preview, and a discussion room |
| **Expert reader** | Compressed understanding in minimal time | 60-second slides, clean references, and suggestive search |
| **Student** | Seeing thought being built | Rewriting with selectable tone and open sessions |
| **Editor / Reviewer** | Focus on content and peer review | Role-based access (editor/contributor) and version history |

At launch the platform is a **small, invite-only community** — quality of ties over quantity of members.`,
  },
  {
    id: '05',
    section_key: 'content',
    order_num: 5,
    title_fa: '۵ — ساحتِ محتوا',
    title_en: '05 — Content Domain',
    body_fa: `**مرزِ محتوایی** روشن است و بیرون از آن، پلتفرم پاسخی ندارد:

- درونِ مرز: مقالاتِ مفهومی، مرورِ نظام‌مندِ کوتاه، گزارشِ داده‌ی کوچکِ تمیز، ترجمه‌ی دقیقِ متونِ کلیدی با حاشیه‌ی تحلیلی.
- بیرونِ مرز: خبرِ روز، یادداشتِ سلیقه‌ایِ بی‌ارجاع، و محتوای تبلیغی.

**یکایِ انتشار:** هر *مقاله* از یک *فراداده* (عنوانِ فارسی/انگلیسی، چکیده، برچسب، تصویرِ جلد) و چند *اسلاید* (عنوان، بدنه‌ی غنی، پیوستِ رسانه) تشکیل می‌شود. وضعیتِ مقاله تنها **پیش‌نویس / منتشرشده** است؛ حدِ میانه‌ای نیست.

**زبان:** همه‌ی میدان‌های متنی، ستونِ فارسی و انگلیسیِ جدا دارند. اگر یکی خالی بماند، رابط همان را که هست نشان می‌دهد؛ ولی انتشارِ دو زبانه‌ی کامل، قاعده‌ی ادبِ حرفه‌ای است.`,
    body_en: `**The content boundary** is sharp — outside it, the platform has no answer:

- Inside: conceptual articles, short systematic reviews, small clean data reports, precise translations of key texts with analytical margins.
- Outside: daily news, unreferenced opinion notes, promotional content.

**Unit of publication:** Each *article* consists of *metadata* (title FA/EN, abstract, tags, cover) and several *slides* (title, rich body, media attachments). Status is strictly **draft / published** — no in-between.

**Language:** Every textual field has separate FA/EN columns. If one is empty the interface shows what exists, but a fully bilingual publication is the rule of professional courtesy.`,
  },
  {
    id: '06',
    section_key: 'architecture',
    order_num: 6,
    title_fa: '۶ — کالبدِ فنی و نقش‌ها',
    title_en: '06 — Architecture & Roles',
    body_fa: `معماری، عمداً **خلوت و خوانا** انتخاب شده است:

- **فرانت‌اند:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui — تمِ روشنِ کاغذی (‎#FBF6EA) و تمِ تیره‌ی سرمه‌ای (‎#0F1E2E) برگرفته از پروفایلِ کاشانِ کتابچه‌ی هویت بصری؛ فونتِ فارسی **IRANSharp** (۳ وزن) و فونتِ لاتین **Cormorant Garamond / Inter**.
- **بک‌اند:** Supabase — Postgres (هسته‌ی داده)، Auth (نشست)، Storage (رسانه)، Edge Functions (Deno) برای کارهایِ حساس
- **زنده:** LiveKit Cloud برای صدا و تصویر؛ توکنِ کوتاه‌عمر از Edge Function صادر می‌شود و هرگز از کلاینت نشت نمی‌کند
- **حالت:** Context (Auth, Language) + TanStack Query — بدونِ Reduxِ افزوده

**سطوح دسترسی و نقش‌ها (RBAC Matrix):**
پلتفرم دارای **۴ نقش رسمی (admin, editor, contributor, user)** + **مهمان (guest)** است:
- **guest (مهمان):** خواندن مقالات منتشرشده، رسانه‌های عمومی و کارت‌های جامعه.
- **user (کاربر عادی):** + ویرایش پروفایل، نظر روی مقالات، آپلود در فضای شخصی ۱۵ گیگابایتی.
- **contributor (نویسنده):** + ایجاد و مدیریت مقالات و اسلایدهای خود، تغییر وضعیت نمایش رسانه.
- **editor (ویرایشگر):** + ویرایش و بررسی همه مقالات و اسلایدها، انتشار مقالات، مدیریت اشخاص (persons).
- **admin (مدیر):** + دسترسی کامل به کاربر، نقش‌ها، حذف آثار و تنظیمات پروژه.

**حساب‌های تستی ۴ نقش رسمی (جهت تست و اعتبارسنجی):**
- **Admin:** \`admin@kaghazbaad.test\` / \`TestAdmin@2026!\`
- **Editor:** \`editor@kaghazbaad.test\` / \`TestEditor@2026!\`
- **Contributor:** \`contributor@kaghazbaad.test\` / \`TestContributor@2026!\`
- **User:** \`user@kaghazbaad.test\` / \`TestUser@2026!\`

**طرحواره‌ی کلیدی:**
\`profiles ↔ user_roles\`، \`articles ↔ slides\`، \`live_sessions ↔ live_participants\`، و \`otp_codes\` برای ورودِ بی‌گذر. تمامِ سطرها با **RLS** محافظت می‌شوند؛ کلاینت هرگز بیش از حقِ نقشِ خود نمی‌بیند.`,
    body_en: `The architecture is deliberately **spare and legible**:

- **Frontend:** React 18 + TypeScript + Vite 5 + Tailwind 3 + shadcn/ui — light parchment theme (#FBF6EA) and dark navy theme (#0F1E2E) from the Kashan profile of the visual identity; Persian **IRANSharp** (3 weights) and Latin **Cormorant Garamond / Inter**.
- **Backend:** Supabase — Postgres (core), Auth (session), Storage (media), Edge Functions (Deno) for sensitive work
- **Live:** LiveKit Cloud for audio/video; short-lived tokens are minted by an Edge Function and never leak from the client
- **State:** Context (Auth, Language) + TanStack Query — no extra Redux

**Access Levels & Roles (RBAC Matrix):**
The platform features **4 official roles (admin, editor, contributor, user)** + **guest (anon)**:
- **guest:** Read published articles, public media, and community cards.
- **user:** + Edit own profile, comment on articles, upload to 15GB personal quota.
- **contributor:** + Create and manage own articles & slides, change media visibility.
- **editor:** + Edit/review all articles & slides, publish articles, manage persons.
- **admin:** + Full administrative control over users, roles, deletions, and project config.

**Test Accounts (4 Official Roles):**
- **Admin:** \`admin@kaghazbaad.test\` / \`TestAdmin@2026!\`
- **Editor:** \`editor@kaghazbaad.test\` / \`TestEditor@2026!\`
- **Contributor:** \`contributor@kaghazbaad.test\` / \`TestContributor@2026!\`
- **User:** \`user@kaghazbaad.test\` / \`TestUser@2026!\`

**Key schema:**
\`profiles ↔ user_roles\`, \`articles ↔ slides\`, \`live_sessions ↔ live_participants\`, and \`otp_codes\` for passwordless entry. Every row is guarded by **RLS** — the client never sees beyond its role.`,
  },
  {
    id: '07',
    section_key: 'editorial',
    order_num: 7,
    title_fa: '۷ — آدابِ انتشار',
    title_en: '07 — Editorial Etiquette',
    body_fa: `1. **زبانِ فارسیِ معیار** با نویسه‌های درست (ی/ک فارسی، اعدادِ فارسی ۰-۹ و جداکننده‌ی هزارگانِ ‎٬)؛ ارجاعِ کامل؛ پرهیز از اطناب.
2. **اسلایدِ خوب، یک فکرِ کامل است.** اگر اسلاید به دو فکر شکست، دو اسلاید بنویس.
3. **تصویر، تزیین نیست؛ دلیل است.** هر رسانه باید به فهمِ همان اسلاید کمک کند.
4. **جلسه‌ی زنده، کلاسِ درس نیست؛ کارگاهِ پرسش است.** نویسنده ۱۰ دقیقه می‌گوید، ۵۰ دقیقه می‌شنود.
5. **بازنویسیِ هوشمند ابزاری کمکی است** — لحن و طول را تغییر می‌دهد، ولی مسئولیتِ صحتِ علمی هم‌چنان با نویسنده است.

تخلف از این آداب، پیش از هر آیین‌نامه‌ای، به قضاوتِ جمعِ کوچکِ داوران و ویراستاران گذاشته می‌شود.`,
    body_en: `1. **Standard Persian** with correct characters (Persian ی/ک, Persian numerals ۰-۹ and thousands separator ٬); full citations; no verbosity.
2. **A good slide is one complete thought.** If it splits into two thoughts, make two slides.
3. **An image is not decoration; it is an argument.** Every medium must help understand that slide.
4. **A live session is not a lecture; it is a workshop of questions.** The author speaks for 10 minutes, listens for 50.
5. **Smart rewriting is an aid** — it changes tone and length, but scientific accuracy remains the author’s responsibility.

Violation is judged first by the small circle of guest reviewers and editors, before any bylaw.`,
  },
  {
    id: '08',
    section_key: 'future',
    order_num: 8,
    title_fa: '۸ — چشم‌انداز',
    title_en: '08 — Outlook',
    body_fa: `گامِ بعدی، **حافظه‌ی مشترک** است: هر مقاله، پس از جلسه‌ی زنده‌اش، یک «برگِ افزوده» می‌گیرد — خلاصه‌ی پرسش‌ها، اصلاح‌های پذیرفته، و پیوند به پژوهش‌های بعدی. به این ترتیب «کاغذ» هرگز کهنه نمی‌شود؛ با «باد» تازه می‌ماند.

در افقِ دور، می‌خواهیم همین کالبدِ خلوت را به **خود-میزبانیِ کامل** ببریم: داده‌ها بر سرورِ دانشگاه بمانند، LiveKit خود-میزبان شود، و مدلِ بازنویسی، محلی اجرا شود — بی‌آن‌که تجربه‌ی نویسنده و خواننده تغییر کند.

> کاغذ می‌ماند؛ باد می‌وزد؛ فهم می‌ماند که در میانِ این دو بماند.`,
    body_en: `Next is **shared memory**: after its live session each article gains an “addendum leaf” — a summary of questions, accepted corrections, and links to follow-up work. Thus paper never ages; it stays fresh with wind.

Further out, we aim to take this spare body to **full self-hosting**: data stays on the university’s server, LiveKit self-hosted, the rewriting model runs locally — without changing the author’s or reader’s experience.

> Paper remains; wind blows; understanding remains that stays between the two.`,
  },
];

export default function AboutProject() {
  const { locale } = useLanguage();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('project_description')
        .select('*')
        .order('order_num', { ascending: true });
      // اگر جدول خالی بود، از شرح ادبیِ دسته‌بندی‌شده‌ی بالا استفاده کن
      if (data && data.length > 0) {
        setSections(data as Section[]);
      } else {
        setSections(FALLBACK_SECTIONS);
      }
      setLoading(false);
    })();
  }, []);

  const pageTitle = locale === 'fa' ? 'شرح پروژه — کاغذ و باد' : 'Project Description — KaghazBaad';
  const pageDesc = locale === 'fa'
    ? 'شرحِ ادبی و دسته‌بندی‌شده‌ی کاغذ و باد: فلسفه‌ی نام، مأموریت، مخاطب، محتوا، کالبد فنی و آداب انتشار.'
    : 'Literary, categorized description of KaghazBaad: naming, mission, audience, domain, architecture and etiquette.';

  useEffect(() => {
    document.title = pageTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', pageDesc);
  }, [pageTitle, pageDesc]);

  const icons: Record<string, JSX.Element> = {
    identity: <FileText className="h-5 w-5" />,
    naming: <BookOpen className="h-5 w-5" />,
    mission: <Target className="h-5 w-5" />,
    audience: <Users className="h-5 w-5" />,
    content: <Layers className="h-5 w-5" />,
    architecture: <Cpu className="h-5 w-5" />,
    editorial: <ScrollText className="h-5 w-5" />,
    future: <Eye className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen py-10 md:py-14" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <div className="flex justify-center mb-5">
              <div className="glass-surface rounded-2xl p-3.5 shadow-soft">
                <FileText className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-[IRANSharp]">
              {locale === 'fa' ? 'شرح پروژه' : 'Project Description'}
            </h1>
            <p className="text-foreground/60 mt-3 text-sm md:text-[15px] font-light leading-7 max-w-2xl mx-auto">
              {locale === 'fa'
                ? 'متنی برای فهمِ درست — نه برای پر کردنِ صفحه. هر بخش، یک پرسشِ بنیادین را آرام و دسته‌بندی‌شده پاسخ می‌دهد.'
                : 'A text for right understanding — not for filling pages. Each section quietly answers one fundamental question.'}
            </p>
            <div className="mt-6 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-border to-transparent" />
          </header>

          {loading ? (
            <div className="text-center text-foreground/50 py-12">…</div>
          ) : (
            <div className="space-y-5">
              {sections.map((s) => {
                const title = locale === 'fa' ? s.title_fa : s.title_en;
                const body = locale === 'fa' ? s.body_fa : s.body_en;
                const icon = icons[s.section_key] ?? <FileText className="h-5 w-5" />;
                return (
                  <Card key={s.id} className="glass-surface overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-[17px] md:text-[19px] font-semibold">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {icon}
                        </span>
                        <span className="font-[IRANSharp]">{title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="prose prose-sm md:prose-base max-w-none prose-headings:font-[IRANSharp] prose-headings:font-semibold prose-p:font-light prose-p:leading-8 prose-li:font-light prose-li:leading-7 prose-strong:text-foreground prose-strong:font-semibold prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-table:text-[13px] prose-th:text-muted-foreground prose-th:font-medium dark:prose-invert">
                        <ReactMarkdown>{body}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <footer className="mt-10 text-center text-[11px] text-muted-foreground font-light">
            {locale === 'fa' ? (
              <>آخرین ویرایش: مرداد ۱۴۰۴ — نگارشِ ادبی: کاغذ و باد</>
            ) : (
              <>Last edit: August 2025 — Literary editing: KaghazBaad</>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
