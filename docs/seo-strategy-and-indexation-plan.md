# راهبرد جامع SEO و Indexation برای کاغذ و باد

**نسخه:** ۱.۰ — ۱۹ اوت ۲۰۲۶  
**دامنهٔ هدف:** `https://kaghazobaad.ir`  
**مبنای فنی:** React + Vite + React Router در frontend، Node.js/Fastify در backend و PostgreSQL روی Liara

## خلاصهٔ اجرایی

برای کاغذ و باد، «بالاترین روش SEO» به‌معنای افزودن متاتگ‌های بیشتر نیست؛ بالاترین روش، ساختن یک **سطح محتوای عمومیِ قابل‌خزش، قابل‌رندر، قابل‌فهم و قابل‌اندازه‌گیری** در کنار سطح اپلیکیشن خصوصی است. راهنمای رسمی Google تأکید می‌کند که SEO باید به موتور جست‌وجو کمک کند محتوا را بفهمد و به کاربر کمک کند تصمیم بگیرد وارد صفحه شود؛ هیچ تکنیک مستقلی رتبهٔ اول را تضمین نمی‌کند [1].

معماری فعلی برای قابلیت‌های تعاملی مناسب است، اما برای SEO یک ریسک مهم دارد: مسیرهای عمومی با client-side rendering در یک SPA ارائه می‌شوند و محتوای اصلی، canonical و structured data پس از اجرای JavaScript به DOM اضافه می‌شوند. Google می‌تواند JavaScript را crawl، render و index کند، اما خود مستندات Google می‌گوید server-side rendering یا prerendering برای سرعت کاربر و crawlerها همچنان ایدهٔ بهتری است و همهٔ botها JavaScript را اجرا نمی‌کنند [2]. بنابراین پیشنهاد نهایی، **بازنویسی کامل محصول نیست**؛ بلکه جداسازی تدریجی «Public Content Surface» از «Authenticated App Surface» است.

| اصل راهبردی | تصمیم پیشنهادی برای کاغذ و باد |
|---|---|
| سطح عمومی | صفحات خانه، معرفی، شرح پروژه، فهرست مقالات، مقالهٔ منتشرشده و در صورت محتوای کافی فهرست رسانه/جلسات |
| سطح خصوصی | ورود، داشبورد، ادمین، ویرایش، rewrite، تکمیل پروفایل، تغییر رمز و عملیات مدیریت Live |
| رندر | در کوتاه‌مدت prerender/SSG برای صفحات ثابت و مقالات منتشرشده؛ در میان‌مدت SSR/SSG برای public surface و حفظ SPA برای داشبورد |
| چندزبانی | URL مستقل برای فارسی و انگلیسی، سپس hreflang دوطرفه؛ تغییر زبان صرفاً با state داخلی برای SEO کافی نیست |
| دادهٔ ساختاریافته | `Organization`، `WebSite`، `WebPage`، `BreadcrumbList` برای صفحات عمومی و `Article` برای مقالات واقعی؛ فقط markup منطبق با محتوای قابل مشاهده |
| کشف محتوا | sitemap پویا از مقالات منتشرشده، robots.txt دقیق، لینک‌های داخلی واقعی و Search Console |
| معیار موفقیت | Crawl/index coverage، rich-result validity، organic impressions، CTR، Core Web Vitals و کیفیت ورودی، نه صرفاً رتبهٔ یک کلمه |

## یافته‌های ممیزی معماری فعلی

در ریپو، React Router مسیرهای `/`، `/read`، `/read/:slug`، `/media`، `/about`، `/about-project`، `/community`، `/live`، `/auth`، `/dashboard`، `/admin`، `/complete-profile`، `/live/new`، `/live/:id`، `/rewrite` و `/change-password` را مدیریت می‌کند. مسیر `/read/:slug` به endpoint عمومی backend برای مقاله بر اساس slug متصل است؛ بنابراین پایهٔ فنی لازم برای ساخت sitemap و metadata اختصاصی مقاله وجود دارد.

صفحهٔ «شرح پروژه» اکنون runtime metadata، canonical، Open Graph، Twitter Card و JSON-LD دارد؛ این اصلاح برای تجربهٔ مرورگر و Googlebot پس از rendering مناسب است. بااین‌حال fallback اولیهٔ `index.html` برای همهٔ routeها مشترک است. در نتیجه، crawlerهایی که JavaScript اجرا نمی‌کنند برای routeهای مختلف ممکن است همان metadata عمومی homepage را ببینند. این موضوع دلیل اصلی اولویت‌دادن به prerender یا SSR برای سطح محتوای عمومی است.

همچنین URL فارسی و انگلیسی فعلاً یکسان است و زبان با context داخلی تغییر می‌کند. Google می‌گوید برای نسخه‌های زبانی باید URLهای جایگزین کامل و دوطرفه معرفی شوند؛ هر نسخه باید خودش و نسخه‌های دیگر را فهرست کند [3]. پس تا زمانی که URL مستقل فارسی/انگلیسی نداریم، نباید hreflang صوری و ناقص اضافه کنیم.

## ماتریس تصمیم برای indexation

| مسیر یا نوع صفحه | تصمیم | دلیل و اقدام فنی |
|---|---:|---|
| `/` | `index,follow` | صفحهٔ اصلی عمومی؛ title، description، Organization/WebSite و لینک به سطوح اصلی |
| `/about` | `index,follow` | معرفی عمومی پروژه، مشروط به محتوای یکتا و به‌روز |
| `/about-project` | `index,follow` | blueprint عمومی محصول؛ canonical، WebPage، Breadcrumb و FAQ فقط برای پرسش‌های قابل مشاهده |
| `/read` | `index,follow` | hub مقالات؛ باید متن معرفی، pagination/cursor قابل crawl و لینک HTML واقعی داشته باشد |
| `/read/:slug` | `index,follow` فقط اگر published | مهم‌ترین سطح SEO؛ prerender/SSR، `Article`، author، datePublished/dateModified، image، canonical و breadcrumb |
| `/media` | مشروط | فقط اگر landing محتوایی و رسانه‌های عمومی قابل جست‌وجو دارد؛ صفحات private media نباید index شوند |
| `/community` | مشروط | اگر محتوای عمومیِ پایدار و معنادار دارد index؛ اگر صرفاً فهرست پویا یا کاربرمحور است noindex یا محدود |
| `/live` | مشروط | فهرست جلسات عمومی و آتی می‌تواند index شود؛ جلسات خصوصی/منقضی noindex یا 404 معنی‌دار |
| `/live/:id` | معمولاً `noindex` | اتاق تعاملی و نیازمند session؛ در صورت ساخت landing عمومی جدا، آن landing index شود نه اتاق خصوصی |
| `/auth` | `noindex,nofollow` | صفحهٔ عملیاتی ورود است، نه مقصد جست‌وجویی |
| `/dashboard` و `/admin` | `noindex,nofollow` + کنترل auth | محتوای شخصی/مدیریتی و غیرقابل‌نمایش عمومی؛ پاسخ unauthenticated باید 401/403 مناسب بدهد |
| `/complete-profile` و `/change-password` | `noindex,nofollow` | فرم‌های حساب و عملیات خصوصی |
| `/rewrite` | `noindex,nofollow` | ابزار خصوصی AI و احتمال وجود محتوای حساس کاربر |
| `/live/new` | `noindex,nofollow` | فرم ایجاد جلسه و فقط برای کاربر واردشده |
| APIها | index نشوند | با `X-Robots-Tag: noindex` و نبودن در sitemap؛ endpointهای auth و mutation باید 401/403 داشته باشند |
| route ناشناخته | 404 واقعی یا noindex | SPA نباید همهٔ routeهای ناشناخته را با HTTP 200 و محتوای مشابه به soft 404 تبدیل کند؛ Google برای soft 404 در SPA راهکار 404 واقعی یا noindex را توصیه می‌کند [2] |

## استاندارد فنی پیشنهادی

### ۱. رندر و معماری انتشار

در فاز اول، صفحات ثابت `/`، `/about` و `/about-project` با prerender در زمان build تولید شوند. برای `/read` و `/read/:slug`، pipeline انتشار باید فهرست مقالات منتشرشده را از API backend بخواند و برای هر slug صفحهٔ HTML اولیه تولید کند. این کار بدون تغییر backend احراز هویت ممکن است، زیرا endpoint عمومی مقاله بر اساس slug وجود دارد.

در مقیاس متوسط، مناسب‌ترین معماری **hybrid rendering** است: سطح عمومی با SSR/SSG و cache، و داشبورد/Live/مدیریت همچنان client-side و session-based. اگر تعداد مقالات و تغییرات محتوا زیاد شود، انتقال public surface به Remix یا یک React framework با SSR/streaming قابل بررسی است؛ اما بازنویسی کامل در این مرحله ریسک بیشتری از ارزش SEO دارد.

### ۲. URL، canonical و چندزبانی

برای هر محتوای عمومی یک URL پایدار و توصیفی لازم است. slug مقاله باید canonical باشد و queryهای فیلتر، sort و pagination نباید URLهای رقیب بسازند. canonical باید در HTML اولیه با URL مطلق قرار گیرد؛ Google استفادهٔ JavaScript برای canonical را ممکن می‌داند، اما بهترین روش HTML اولیه است و canonical runtime نباید با canonical اولیه تعارض داشته باشد [2].

برای زبان‌ها یکی از این الگوها باید انتخاب شود: `/fa/...` و `/en/...`، یا زیردامنه‌های `fa.` و `en.`. پیشنهاد پروژه، prefix مسیر است چون با دامنهٔ فعلی و deployment Liara ساده‌تر است. پس از ایجاد هر دو نسخه، در هر صفحه `hreflang`های `fa`، `en` و `x-default` و canonical همان نسخه قرار گیرد؛ تمام URLها باید fully qualified و لینک‌ها دوطرفه باشند [3].

### ۳. Structured Data

Structured data باید بازتاب محتوای قابل مشاهده باشد و به‌عنوان تضمین رتبه یا rich result تلقی نشود. Google استفاده از structured data را برای فهم بهتر محتوا و احتمال نمایش بهتر، نه برای تضمین نمایش، توصیه می‌کند [4].

| صفحه | Schema پیشنهادی |
|---|---|
| کل سایت | `Organization` و `WebSite` با نام، URL، logo و در صورت وجود `sameAs` واقعی |
| خانه و صفحات معرفی | `WebPage` و در صورت وجود، `BreadcrumbList` |
| شرح پروژه | `WebPage`، `BreadcrumbList` و `FAQPage` فقط برای FAQ واقعی و قابل مشاهده |
| مقاله | `Article` یا `BlogPosting`، author واقعی، headline، image، datePublished، dateModified، publisher، mainEntityOfPage |
| پروفایل نویسندهٔ عمومی | `ProfilePage` در صورت وجود صفحهٔ عمومی واقعی |
| جلسهٔ عمومی | `Event` فقط اگر تاریخ، زمان، نام، venue/online location و status واقعاً وجود دارد و صفحه عمومی است |
| اتاق خصوصی | بدون structured data عمومی و با noindex |

برای مقاله‌ها، Google بر author، title، تاریخ، image و canonical تأکید دارد و توصیه می‌کند structured data با محتوای قابل مشاهده و اطلاعات واقعی نویسندگان منطبق باشد [5]. برای breadcrumb نیز JSON-LD باید مسیر واقعی کاربر را نشان دهد، نه صرفاً تقلید مکانیکی از URL [6].

### ۴. Sitemap و robots

Google sitemap را ابزار اعلام URLهای مهم، ارتباط نسخه‌های زبانی و metadata مربوط به فایل‌ها می‌داند؛ sitemap کشف URL را بهتر می‌کند اما indexing را تضمین نمی‌کند [7]. برای کاغذ و باد باید sitemap پویا شامل homepage، صفحات معرفی، hub مقالات و فقط مقالات `published` باشد. مقالات draft، محتوای private، API، داشبورد و صفحات احراز هویت نباید داخل sitemap باشند.

در کمتر از حدود ۵۰۰ صفحهٔ indexable، یک `sitemap.xml` کافی است؛ با رشد تعداد مقالات، sitemap index و تقسیم بر نوع/تاریخ مناسب می‌شود. `robots.txt` باید مسیرهای عمومی را باز بگذارد و مسیرهای عملیاتی مانند `/dashboard`، `/admin` و endpointهای داخلی را مدیریت کند؛ اما برای حذف قطعی یک صفحه از index نباید فقط به robots.txt متکی شد، زیرا crawler ممکن است meta robots را نبیند. برای HTML از `noindex` و برای PDF، تصویر یا فایل رسانه‌ای خصوصی از `X-Robots-Tag` استفاده شود [8].

### ۵. Performance و تجربهٔ کاربر

Core Web Vitals بخشی از ارزیابی تجربهٔ واقعی کاربر است. اهداف رسمی پیشنهادی Google عبارت‌اند از LCP کمتر از ۲٫۵ ثانیه، INP کمتر از ۲۰۰ میلی‌ثانیه و CLS کمتر از ۰٫۱ [9]. برای این ریپو، مهم‌ترین اقدام‌ها عبارت‌اند از code splitting عمیق‌تر برای LiveKit/PDF، lazy loading رسانه‌ها، تعیین width/height تصویر، preload محدود فونت اصلی، کاهش chunkهای بالای ۵۰۰KB، cache بلندمدت assetهای hash‌شده و جلوگیری از بارگذاری LiveKit در مسیرهای غیر Live.

هشدار فعلی chunkهای بزرگ نشانهٔ خطای SEO به‌تنهایی نیست، اما برای LCP و INP و هزینهٔ crawl/transfer اهمیت دارد. بودجهٔ اولیهٔ پیشنهادی: مسیرهای عمومی بدون LiveKit کمتر از ۲۰۰KB JavaScript فشردهٔ اولیه، LCP موبایل زیر ۲٫۵ ثانیه در شبکهٔ مناسب و CLS نزدیک صفر.

### ۶. محتوای آکادمیک و اعتماد

Google بر محتوای مفید، قابل‌اعتماد، اصیل، به‌روز و people-first تأکید می‌کند [1]. برای مقالات کاغذ و باد این اصل باید به فیلدهای واقعی محصول تبدیل شود: نام و صفحهٔ عمومی نویسنده، وابستگی یا bio در صورت تمایل، چکیدهٔ روشن، ارجاعات، تاریخ انتشار و ویرایش، وضعیت editorial، زبان مقاله و تصویر نماینده. AI نباید جای author، citation یا مسئولیت علمی را بگیرد؛ در metadata نیز فقط اطلاعات قابل مشاهده و قابل اثبات قرار گیرد.

## برنامهٔ اجرایی مرحله‌ای

### فاز صفر: اندازه‌گیری و حفاظت

Search Console برای دامنهٔ اصلی و در صورت نیاز API property ثبت شود؛ sitemap فعلی و robots بررسی و baseline از URL Inspection، Index Coverage، impressions، CTR، Core Web Vitals و خطاهای 404 ثبت شود. در همین فاز، صفحات auth/dashboard/admin/rewrite و APIها noindex یا X-Robots-Tag مناسب بگیرند تا قبل از رشد محتوا، indexation ناخواسته رخ ندهد.

### فاز یک: زیرساخت crawl و indexation

یک registry مرکزی برای route SEO ساخته شود که برای هر route، `indexable`، canonical، title، description، locale، schema type و auth requirement را تعریف کند. سپس robots.txt، sitemap استاتیک/پویا، 404 واقعی و noindex صفحات خصوصی از همین قرارداد تولید شوند. metadata نباید در چند کامپوننت به‌صورت پراکنده و متناقض نوشته شود.

### فاز دو: public rendering

برای صفحات ثابت prerender و برای فهرست/جزئیات مقالات published، HTML اولیهٔ crawlable تولید شود. لینک‌های داخلی باید `<a href="/read/slug">` واقعی باشند؛ Google در SPA لینک‌هایی را برای کشف بهتر می‌پذیرد که در href قابل استخراج باشند [2]. در این فاز، fallback مشترک index.html نباید تنها منبع SEO routeهای عمومی باقی بماند.

### فاز سه: چندزبانی واقعی

URLهای `/fa/...` و `/en/...`، cookie/context فقط برای تجربهٔ کاربر، canonical مستقل و hreflang دوطرفه پیاده شود. برای routeهایی که هنوز ترجمهٔ کامل ندارند، نسخهٔ ناقص با hreflang اعلام نشود؛ ابتدا محتوای اصلی هر دو زبان آماده شود.

### فاز چهار: structured data و محتوای مقاله

`Article` برای مقالات واقعی، `BreadcrumbList` برای مسیرهای عمومی، `Organization/WebSite` در سطح سایت و `Event` فقط برای landingهای عمومی جلسات اضافه شود. همهٔ markupها با Rich Results Test و URL Inspection بررسی شوند؛ Google توصیه می‌کند structured data پس از deploy در Search Console و ابزارهای اعتبارسنجی کنترل شود و برای recrawl زمان در نظر گرفته شود [5] [6].

### فاز پنج: performance و رشد محتوا

با Lighthouse/CrUX و Search Console، مسیرهای عمومی اندازه‌گیری و chunkهای LiveKit/PDF از initial load جدا شوند. سپس تقویم محتوایی مقاله، لینک‌سازی داخلی، صفحات نویسندگان و به‌روزرسانی تاریخ/ارجاعات اجرا شود. لینک خارجی و promotion باید نتیجهٔ محتوای مفید باشد، نه جایگزین کیفیت صفحه.

## ترتیب اولویت برای اجرای واقعی

| اولویت | کار | ارزش | ریسک | تصمیم |
|---:|---|---:|---:|---|
| ۱ | noindex صفحات خصوصی و 404 واقعی | بسیار بالا | پایین | فوری |
| ۲ | sitemap پویا و robots دقیق | بالا | پایین | فوری |
| ۳ | registry مرکزی metadata و canonical | بالا | متوسط | فوری |
| ۴ | prerender صفحات ثابت | بالا | متوسط | فاز اول اجرایی |
| ۵ | prerender/SSR مقالات published | بسیار بالا | متوسط | فاز اصلی |
| ۶ | URLهای `/fa` و `/en` و hreflang | بالا | متوسط | پس از تثبیت محتوا |
| ۷ | Article/Breadcrumb/Organization/Event schema | بالا | پایین تا متوسط | هم‌زمان با public rendering |
| ۸ | تفکیک chunkهای LiveKit/PDF و بودجهٔ performance | بالا | متوسط | هم‌زمان با rendering |
| ۹ | Search Console، Rich Results و Core Web Vitals monitoring | بالا | پایین | از ابتدا و مستمر |
| ۱۰ | مهاجرت کامل public surface به Remix/SSR | بالقوه بسیار بالا | بالا | فقط پس از اثبات نیاز مقیاس |

## نتیجهٔ نهایی

پیشنهاد حرفه‌ای برای این پروژه **ترکیب SSR/SSG برای محتوای عمومی با SPA برای اپلیکیشن خصوصی** است. اجرای فوری یک migration کامل به Remix ضروری نیست و می‌تواند ریسک regression در Auth، LiveKit، RBAC و dashboard را بالا ببرد. ابتدا باید مرز indexable/private، sitemap، noindex، 404، metadata registry و prerender صفحات ثابت و مقالات published درست شود. پس از داشتن دادهٔ واقعی Search Console و Core Web Vitals، تصمیم مهاجرت public surface به framework SSR بر اساس مقیاس و نرخ تغییر محتوا گرفته شود.

به‌عبارت دقیق، صفحه‌های زیر باید SEO شوند: خانه، معرفی، شرح پروژه، hub مقالات، مقالات منتشرشده، صفحات عمومی نویسندگان و در صورت کیفیت کافی landing جلسات. صفحه‌های ورود، داشبورد، ادمین، rewrite، فرم‌های ایجاد و تغییر رمز، اتاق خصوصی Live و APIها نباید SEO شوند. این جداسازی هم با هدف موتور جست‌وجو سازگار است و هم از نشت محتوای خصوصی و مصرف بی‌هدف crawl budget جلوگیری می‌کند.

## منابع مرجع

[1]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "Google Search Central — SEO Starter Guide"

[2]: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics "Google Search Central — JavaScript SEO Basics"

[3]: https://developers.google.com/search/docs/specialty/international/localized-versions "Google Search Central — Localized Versions of Your Page"

[4]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data "Google Search Central — Introduction to Structured Data Markup"

[5]: https://developers.google.com/search/docs/appearance/structured-data/article "Google Search Central — Article Structured Data"

[6]: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb "Google Search Central — Breadcrumb Structured Data"

[7]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview "Google Search Central — Sitemaps Overview"

[8]: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag "Google Search Central — Robots Meta Tags and X-Robots-Tag"

[9]: https://developers.google.com/search/docs/appearance/core-web-vitals "Google Search Central — Core Web Vitals and Search Results"

[10]: https://ogp.me/ "The Open Graph Protocol"


## وضعیت اجرای برنامه

در اجرای این برنامه، قرارداد مرکزی SEO در `src/lib/seo.ts` ایجاد شد و policy صفحات عمومی و خصوصی در یک نقطه ثبت شد. صفحات عملیاتی شامل Auth، داشبورد، مدیریت، Rewrite، تغییر رمز و اتاق زنده با `noindex` و در موارد حساس `nofollow` پوشش داده شدند؛ NotFound نیز metadata `noindex` اعمال می‌کند.

پیش از build، اسکریپت `scripts/generate-seo-files.mjs` فهرست مقالات published را از endpoint عمومی backend می‌خواند و `robots.txt` و `sitemap.xml` را تولید می‌کند. sitemap شامل مسیرهای عمومی، نسخه‌های `/fa` و `/en` و مقالات published است و hreflangهای `fa`، `en` و `x-default` را در خود دارد. در زمان ممیزی، endpoint عمومی مقالات پاسخ سالم اما بدون مقالهٔ published داد؛ بنابراین sitemap فعلی ۱۵ مسیر عمومی دارد و با انتشار اولین مقاله، مسیرهای مقاله در build بعدی به‌صورت خودکار اضافه می‌شوند.

برای crawlerهای فاقد JavaScript، `scripts/prerender-seo-pages.mjs` پس از Vite build برای صفحات خانه، درباره، شرح پروژه، مقالات، رسانه و نسخه‌های زبانی HTML route-specific تولید می‌کند. برای صفحهٔ شرح پروژه، `FAQPage` و `BreadcrumbList` نیز در HTML اولیه درج می‌شود. مقالات published نیز با `Article`، تاریخ، تصویر و canonical اختصاصی prerender می‌شوند.

مسیرهای locale-prefixed برای صفحات عمومی در Router اضافه شدند و wrapperهای `PublicSeoRoute` و `LocalizedRoute` metadata، زبان، جهت و canonical را هنگام navigation داخلی به‌روز نگه می‌دارند. صفحهٔ مقاله بر اساس زبان و وضعیت انتشار، `Article` و `BreadcrumbList` تولید می‌کند و هنگام خطا noindex می‌شود.

برای performance، vendorهای React، PDF و LiveKit به chunkهای مستقل منتقل شدند؛ LiveKit و PDF در مسیرهای عمومی بار اولیه نیستند. هشدار باقی‌ماندهٔ chunk بزرگ shared در build ثبت شد و به مسیر عملیاتی خصوصی مربوط است، نه HTML عمومی؛ این مورد در backlog performance برای بررسی مستقل با bundle analyzer باقی می‌ماند.

CI اکنون پس از build، `npm run verify:seo` را اجرا می‌کند و وجود canonical، Open Graph، JSON-LD، sitemap و robots را قبل از job deploy کنترل می‌کند. typecheck و lint اختصاصی فایل‌های SEO موفق‌اند؛ build، prerender و smoke test نیز موفق‌اند. lint کامل ریپو همچنان خطاهای قدیمی خارج از این تغییرات دارد و تا زمانی که مسئولانه تفکیک و اصلاح نشوند، نباید به‌عنوان نتیجهٔ این فاز نسبت داده شوند.


## انتشار و وضعیت نهایی production

نسخهٔ SEO پس از build، prerender و smoke test با deploy مستقیم روی `kaghazbaad-frontend` در Liara منتشر شد. صفحات `/about-project/`، `/fa/about-project/` و `/en/about-project/` با HTTP 200 پاسخ می‌دهند و HTML اولیهٔ آن‌ها شامل canonical مطابق URL نهایی، `FAQPage`، `BreadcrumbList` و Open Graph است. `robots.txt` با HTTP 200 و `sitemap.xml` با HTTP 200 در دسترس هستند؛ sitemap فعلاً ۱۵ URL عمومی و hreflangهای `fa`، `en` و `x-default` دارد.

در تست اولیه مشخص شد Liara برای routeهای directory-style یک slash نهایی اضافه می‌کند. canonical و sitemap اصلاح شدند تا به نسخهٔ slashدار اشاره کنند و redirect/canonical mismatch باقی نماند. build بعدی، typecheck، lint اختصاصی، verify:seo و deploy مجدد موفق بودند.

commit محلی اصلی `988ffd3` شامل اجرای SEO ساخته شد. push به GitHub در این نشست به‌دلیل نامعتبر بودن credential فعلی GitHub CLI و نبودن کلید SSH انجام نشد؛ هیچ force push یا دورزدن احراز انجام نشد. انتشار Liara از همان source محلی انجام شده و برای همسان‌سازی history، پس از اتصال مجدد GitHub باید commitهای محلی باقی‌مانده به `main` push شوند.
