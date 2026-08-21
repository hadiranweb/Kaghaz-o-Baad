# برنامهٔ جامع استفاده از MengTo Skills در «کاغذ و باد»

## هدف

بازطراحی و غنی‌سازی لایهٔ نمایشی «کاغذ و باد» با استفادهٔ حداکثری از قابلیت‌های مرتبط ریپوی [MengTo/Skills](https://github.com/MengTo/Skills) و الگوهای interaction ریپوهای همراه، به‌گونه‌ای که خروجی از نظر بصری غنی، یکپارچه و متمایز باشد، اما در موبایل، reduced motion، JavaScript محدود، WebGL unavailable و دستگاه‌های کم‌توان نیز سریع و قابل استفاده باقی بماند.

منظور از «تمام Skills» در این برنامه، استفاده از **تمام قابلیت‌های مرتبط و دارای نقش واقعی در محصول** است، نه فعال‌کردن هم‌زمان همهٔ ۸۱ مهارت web-design. مهارت‌های نامرتبط، تزئینی یا متعارض عمداً در فهرست «بررسی‌شده ولی ردشده» ثبت می‌شوند تا هیچ ظرفیت مفیدی نادیده نماند و در عین حال سیستم بصری دچار آشفتگی نشود.

## وضعیت و فرض‌های فعلی

ریپوی هدف یک اپلیکیشن React 18، TypeScript، Vite و Tailwind است و routeهای عمومی خانه، مقالات، نمایش اسلاید، چندرسانه‌ای، درباره، شرح پروژه و پخش زنده را دارد. در package فعلی GSAP، Lenis، Three.js و wrapperهای React سه‌بعدی نصب نشده‌اند. `MengTo/Skills` عمدتاً specification، prompt و demoهای مستقل HTML است، نه یک package React آمادهٔ import.

فرض این برنامه آن است که مالک محصول با افزودن dependencyهای ضروری، ساخت componentهای جدید و تغییر لایهٔ UI موافق است، اما backend، API، RBAC، quota، payment، LiveKit token و مدل داده نباید برای animation تغییر کنند. همچنین فرض می‌شود artwork، texture، font و audio اختصاصی منابع مرجع بدون مجوز جداگانه وارد production نشوند.

## اصول غیرقابل مذاکره

1. **محتوا بر جلوه مقدم است.** متن، CTA، مقاله، منابع، وضعیت انتشار و navigation همیشه در DOM semantic و مستقل از canvas/WebGL باقی می‌مانند.
2. **Progressive enhancement.** ابتدا نسخهٔ کامل HTML/CSS/React، سپس motion سبک، سپس canvas و فقط در صورت اثبات ارزش محصول WebGL.
3. **یک سیستم motion.** اگر GSAP و ScrollTrigger انتخاب شوند، فقط یک smooth-scroll engine مانند Lenis استفاده می‌شود؛ هم‌زمانی Lenis و engine دیگر ممنوع است.
4. **Fallback واقعی.** reduced motion به حالت نهایی ثابت و ordinary document flow می‌رود؛ صرفاً animation کوتاه نمی‌شود. نبود JavaScript یا WebGL نیز مسیر اصلی را از کار نمی‌اندازد.
5. **اجزای قابل‌آزمایش.** هر قابلیت در component مستقل با lifecycle، cleanup، configuration، performance budget و تست keyboard/touch/RTL/LTR ساخته می‌شود.
6. **مرز داده و نمایش.** slide index، drag offset، particle state و scroll progress محلی و موقت‌اند؛ وضعیت انتشار، نقش، جلسه و تأیید فقط از backend می‌آیند.
7. **provenance و مجوز.** برای هر اقتباس، منبع، نسخه، نوع استفاده، فایل مرتبط و license ثبت می‌شود. Skills با MIT بررسی‌شده است؛ کد و artwork اختصاصی ریپوهای دیگر بدون مجوز کپی نمی‌شود.

## معماری نمایشی هدف

```text
API / backend view models
  ├── articles, versions, slides, media
  ├── publication/workflow state
  ├── live session state
  └── addendum/discussion
             ↓
Presentation components
  ├── KaghazHero
  ├── EditorialSection
  ├── RevealOnScroll
  ├── ScrollChapterProgress
  ├── AmbientPaperParticles
  ├── ArticleArchive
  ├── ArticlePageViewer
  ├── KiteDock
  ├── LiveTimeline
  └── StaticFallbacks
             ↓
Native HTML/CSS → CSS motion → GSAP/ScrollTrigger → Canvas → optional WebGL
```

این معماری اجازه می‌دهد Skills به‌صورت capability مستقل وارد شوند و هیچ component انیمیشنی به API یا backend contract وابسته نشود.

## فاز صفر: baseline، provenance و قرارداد کیفیت

در این فاز هیچ افکت جدیدی به کاربر ارائه نمی‌شود. ساختار فعلی repo، routeها، bundle، LCP/CLS/INP، خطاهای console، وضعیت RTL/LTR، اندازهٔ assetها و رفتار mobile ثبت می‌شود. صفحات `Home.tsx`، `Read.tsx`، `ArticleSlides.tsx`، `AboutProject.tsx`، `Header.tsx` و `index.css` به‌عنوان baseline بازبینی می‌شوند.

برای هر Skill مرتبط یک manifest ساخته می‌شود که شامل این موارد باشد: هدف، محل استفاده، dependency، فایل demo مرجع، نوع adaptation، license/provenance، fallback، budget و معیار حذف. تمام demoهای standalone صرفاً مرجع source و منطق‌اند؛ assetهای هویتی و تصویری آن‌ها کپی نمی‌شوند.

**خروجی پذیرش:** یک گزارش baseline، manifest کامل، ثبت dependencyهای مجاز و فهرست ریسک‌های performance/accessibility.

## فاز یک: سیستم بصری و layout مشترک

در این فاز سه خانوادهٔ Skills ترکیب می‌شوند، اما هرکدام نقش مشخصی دارند:

| خانواده | Skills منتخب | کاربرد |
|---|---|---|
| Editorial | `editorial-tech`، `book-serif-index` | layout نامتقارن کنترل‌شده، metadata، archive و reader |
| Paper/light | `light-mode-paper-technical`، `clean-minimal-beige-light-mode` | نسخهٔ روشن، paper surface و texture محدود |
| Dark/contrast | `dark-blue-contrasting-clean`، `dark-glass-clean-layout` | تم فعلی سرمه‌ای با contrast و glass محدود |
| Structure | `framed-grid-layout`، `container-lines`، `nested-container-frames` | قاب‌بندی و ریتم section بدون bento شلوغ |
| Detail | `beautiful-shadows`، `progressive-blur`، `number-details` | عمق محدود، metadata و انتقال بین states |

یک design token system برای رنگ، type scale فارسی/انگلیسی، max-width متن، spacing، border، shadow، blur، easing و breakpoint ساخته می‌شود. `editorial-tech` زبان اصلی صفحات عمومی می‌ماند؛ `book-serif-index` فقط در archive/reader به کار می‌رود؛ از ترکیب هم‌زمان چند visual style ناسازگار جلوگیری می‌شود.

**خروجی پذیرش:** tokenها، نمونهٔ desktop/mobile، نمونهٔ RTL/LTR، focus states، و تصمیم روشن دربارهٔ تم روشن/تیره.

## فاز دو: بازطراحی Home و AboutProject

Home از search-only به یک تجربهٔ روایی کامل تبدیل می‌شود: hero با تیتر و CTA، search با combobox واقعی، سه مسیر مقالات/اسلاید/پخش زنده، مقالهٔ منتخب، چرخهٔ سه‌مرحله‌ای «بنویس/بساز/زنده کن» و CTA پایانی.

برای hero از `landing-page` به‌عنوان ساختار محتوایی و از `editorial-tech` برای composition استفاده می‌شود. `masked-reveal` و `staggered-word-reveal` فقط روی headingهای کوتاه اعمال می‌شوند. `animation-systems` قواعد duration/easing، entry، hover، focus و reduced motion را تعیین می‌کند. `reveal-hover-effect` فقط برای preview تصویری اختیاری بررسی می‌شود و نباید برای CTAهای اصلی جایگزین hover استاندارد شود.

برای AboutProject، `scroll-world-storytelling` ابتدا در حالت HTML/data اجرا می‌شود: هر فصل یک ادعا، توضیح، evidence و CTA دارد. تنها اگر داستان واقعاً به حرکت تصویری نیاز داشته باشد، prototype canvas/WebGL ساخته می‌شود.

**خروجی پذیرش:** ارزش محصول در اولین viewport روشن باشد، CTAهای اصلی بدون animation قابل استفاده باشند، و صفحه در reduced motion همان پیام و hierarchy را حفظ کند.

## فاز سه: سیستم motion و scroll

در این فاز `animation-systems`، `gsap`، `cinematic-gsap-lenis-motion-system`، `cinematic-scroll-storytelling` و `gsap-scrolltrigger-storytelling` به یک implementation واحد تبدیل می‌شوند. ابتدا native scroll با CSS و IntersectionObserver برای revealهای ساده پیاده می‌شود. فقط برای pin/scrub دقیق و روایت چندمرحله‌ای GSAP/ScrollTrigger اضافه خواهد شد.

اگر آزمایش نشان دهد smooth scroll واقعاً ارزش تجربه‌ای ایجاد می‌کند، Lenis به‌عنوان تنها engine انتخاب می‌شود، با refresh پس از font/media load و destroy هنگام unmount. اگر native scroll کیفیت کافی داشته باشد، dependency اضافه نمی‌شود.

`scroll-progress-timeline` برای chapterهای مقاله، deck و جلسهٔ زنده با `aria-current` و keyboard navigation پیاده می‌شود. `scroll-scrubbed-word-reveal` فقط برای متن کوتاه و غیرحیاتی است. `scroll-scrubbed-visual-sequence` برای hero/about در صورت وجود asset کافی بررسی می‌شود.

**خروجی پذیرش:** هیچ scroll hijacking، layout shift یا animation loop موازی وجود نداشته باشد؛ reduced motion به flow عادی برگردد؛ back/forward navigation و route cleanup سالم باشد.

## فاز چهار: atmosphere و interactionهای سبک

`ambient-section-particles` به‌عنوان renderer اصلی ذرات انتخاب می‌شود: canvas bounded داخل hero/CTA، یک RAF، ResizeObserver، IntersectionObserver، pause در `document.hidden`، cap کردن DPR و `pointer-events:none`. count بر اساس مساحت section و توان device محدود می‌شود.

`falling-leaves` فقط در صورت نیاز به شکل قابل‌شناسایی کاغذ/برگ استفاده می‌شود و نه برای هر ذرهٔ عمومی. `pointer-trail-emitter`، `shaders-cursor-ripples` و `add-shader-cursor-trail` در فاز اول رد می‌شوند چون برای پلتفرم علمی ارزش محتوایی قطعی ندارند؛ در یک hero campaign مستقل می‌توان آن‌ها را آزمایشی فعال کرد.

`beam-glow-states` و `liquid-metal-border` فقط برای stateهای مهم مانند live/active/published قابل بررسی‌اند. افکت نباید به رنگ تنها وابسته باشد و باید متن/status قابل فهم داشته باشد.

**خروجی پذیرش:** particles در موبایل ضعیف و reduced motion خاموش یا static شوند؛ هیچ particle روی متن یا کنترل اصلی نیفتد؛ repeated mount فقط یک loop بسازد.

## فاز پنج: Article Archive و Reader

`book-serif-index`، `editorial-tech` و `scroll-progress-timeline` برای archive و reader به کار می‌روند. آرشیو شامل grid/list قابل اسکن، metadata، filter، query persistence، empty/error/loading state و مسیر مستقیم به متن و deck خواهد بود.

برای `ArticleSlides`، منطق page-turn از `complete-shelf` و `sketchbook` مطالعه و به React/TypeScript بازنویسی می‌شود. state machine پیشنهادی:

```text
archive → preview → reading → slides → references → discussion
```

تعامل page-turn شامل click، buttons، ArrowLeft/ArrowRight، touch/swipe و در صورت مناسب drag است. در همهٔ حالت‌ها شمارهٔ صفحه، progress، عنوان slide، خروجی screen reader و لینک متن کامل باقی می‌ماند. در RTL، معنای قبلی/بعدی بر اساس order محتوایی تعریف می‌شود، نه فقط جهت transform.

**خروجی پذیرش:** viewer تعاملی یک enhancement اختیاری باشد؛ fallback سادهٔ کارت/متن از نظر محتوایی کامل و قابل index باشد؛ هیچ مقاله‌ای فقط در canvas یا تصویر وجود نداشته باشد.

## فاز شش: WebGL و Three.js به‌عنوان آزمایش کنترل‌شده

`threejs`، `webgl-3d-object` و `scroll-world-storytelling` پس از تثبیت نسخهٔ DOM اجرا می‌شوند. تنها یکی از این سناریوها انتخاب خواهد شد: کاور سه‌بعدی سبک در archive، صحنهٔ محدود hero، یا transition روایی AboutProject. اجرای هم‌زمان چند WebGL scene ممنوع است.

canvas مسئولیت واحد دارد، متن و کنترل در DOM هستند، DPR محدود است، renderer هنگام offscreen/hidden متوقف می‌شود، resources dispose می‌شوند، context loss مدیریت می‌شود و static poster آماده است. اگر WebGL باعث افت معیارهای mobile شود یا completion مسیر را بهتر نکند، حذف خواهد شد.

**خروجی پذیرش:** تصمیم اندازه‌گیری‌شده برای keep/remove، poster fallback، bundle budget و تست دستگاه‌های کم‌توان.

## فاز هفت: Live، Media و Addendum

`scroll-progress-timeline` و `cinematic-scroll-storytelling` برای timeline جلسهٔ زنده استفاده می‌شوند، اما timeline فقط view واقعی stateهای backend است. `media` و `addendum` از همان tokenها و chapter navigation استفاده می‌کنند تا محصول هویت یکپارچه داشته باشد.

هیچ audio یا recording خودکاری اضافه نمی‌شود. وضعیت اتصال، loading، permission، پایان جلسه و نبود transcript باید stateهای روشن داشته باشند. animation هرگز نباید token LiveKit، role یا business state را تولید یا ذخیره کند.

**خروجی پذیرش:** live route با اتصال ضعیف و offline graceful باشد؛ timeline متن جایگزین داشته باشد؛ نمایش عمومی بدون سرویس AI/automation کامل بماند.

## فاز هشت: hardening، تست و release

تست‌ها در هر capability و سپس به‌صورت end-to-end انجام می‌شوند:

| دسته | پوشش |
|---|---|
| Viewport | 390، 768، 1024 و 1440 پیکسل، orientation و safe area |
| Input | mouse، touch، keyboard، Escape، Arrow keys، swipe و coarse pointer |
| Language | فارسی RTL، انگلیسی LTR، تغییر زبان در route و متن‌های بلند |
| Motion | reduced motion، tab hidden، window blur، fast scroll و repeated mount |
| Rendering | WebGL unavailable، JS محدود، asset blocked و network slow |
| Accessibility | focus visible، tab order، labels، `aria-current`، announcements و contrast |
| Performance | LCP، CLS، INP، JS/CSS bundle، image weight، RAF count و memory cleanup |
| SEO | title، description، canonical، OG، JSON-LD، crawlable text و route fallback |
| Regression | screenshot/visual regression برای Home، Read، ArticleSlides، AboutProject و Live |

قبل از merge، build production، lint، typecheck، تست route cleanup و بررسی console اجرا می‌شود. تغییرات در branch مستقل با commitهای کوچک و preview انجام می‌شوند. main فقط پس از تأیید مالک محصول و امکان rollback تغییر می‌کند.

## ترتیب اولویت و gateهای تصمیم

| اولویت | قابلیت | شرط ورود | شرط خروج |
|---|---|---|---|
| P0 | design system، Home hero، search، loading/empty/error | baseline ثبت شده | CTA و hierarchy روشن، بدون regression |
| P0 | archive و reader semantic | مدل دادهٔ فعلی قابل مصرف | مسیر مطالعه بدون motion کامل است |
| P1 | masked/staggered reveal، scroll progress | baseline motion و accessibility | fallback و RTL/LTR تأیید شده |
| P1 | ambient paper particles | budget عملکرد مشخص | pause/cleanup/reduced motion سالم |
| P1 | page-turn viewer | reader ساده پایدار | controls و fallback کامل‌اند |
| P2 | GSAP/Lenis storytelling | native scroll ناکافی باشد | فقط یک engine و measurable benefit |
| P2 | WebGL scene/3D cover | asset و narrative تأیید شده | mobile budget و poster fallback قبول |
| P3 | pointer trail، shader ripples، effects تزئینی | use case واقعی محصول | در صورت distraction حذف می‌شوند |

## ریسک‌ها و کنترل آن‌ها

**ریسک انباشت dependency:** ابتدا native/CSS، سپس فقط dependencyهایی که capability مشخصی را حل می‌کنند. هیچ package صرفاً برای شباهت ظاهری نصب نمی‌شود.

**ریسک استفادهٔ نادرست از «تمام Skills»:** قبل از هر feature یک brief شامل audience، outcome، fallback و metric نوشته می‌شود. skillهای متعارض با هم ترکیب نمی‌شوند.

**ریسک license:** Skills MIT است، اما منابع companion و assetهای آن‌ها جداگانه بررسی می‌شوند. در صورت ابهام، منطق interaction بازنویسی و artwork جدید تولید می‌شود.

**ریسک افت خوانایی فارسی:** split text روی متن طولانی، لینک و inline semantic ممنوع است؛ max-width، line-height، direction و font fallback جداگانه تست می‌شوند.

**ریسک performance/WebGL:** scene محدود، DPR cap، pause offscreen، poster fallback، lazy loading و حذف آزمایشی در صورت عدم بهبود KPI.

**ریسک اختلال محصول:** animation state از API و business state جدا می‌ماند؛ هیچ تغییر backend/API برای جلوهٔ بصری انجام نمی‌شود.

## تصمیم‌های باز که پیش از فاز اجرایی باید تأیید شوند

1. آیا هدف visual اصلی، «کاغذ/باد editorial» است یا «محصول آکادمیک دقیق با لایهٔ کاغذ»؟ پیشنهاد برنامه: دومی به‌عنوان پایه و اولی به‌عنوان narrative layer.
2. آیا اضافه‌کردن GSAP و Lenis با bundle budget محصول پذیرفته است؟ پیشنهاد اولیه: ابتدا native scroll و فقط در صورت نیاز Lenis + GSAP.
3. آیا page-turn در مسیر اصلی مطالعه ضروری است یا حالت اختیاری؟ پیشنهاد: اختیاری، با text reader به‌عنوان default.
4. آیا asset اختصاصی برای کاغذ، باد و deck وجود دارد؟ در نبود asset، از artwork منابع مرجع استفاده نشود و fallback typography/shape ساخته شود.
5. معیار موفقیت چیست؟ پیشنهاد: کاهش زمان فهم محصول، افزایش ورود به مقاله، completion خواندن deck، کاهش abandonment و حفظ LCP/INP موبایل؛ نه صرفاً شباهت تصویری به demo.

## نتیجهٔ مورد انتظار

در پایان، «کاغذ و باد» تمام ظرفیت‌های **مرتبط** Skills را در قالب یک سیستم منسجم خواهد داشت: composition editorial، archive کتاب‌مانند، revealهای کنترل‌شده، progress روایی، ذرات کاغذ، viewer صفحه‌ای، timeline جلسه و در صورت اثبات ارزش، یک لایهٔ WebGL محدود. قابلیت‌های بدون ارزش محتوایی یا بدون fallback حذف می‌شوند. نتیجه باید از نظر بصری غنی‌تر از وضعیت فعلی باشد، اما در تجربهٔ اصلی همچنان سریع، semantic، دوزبانه، قابل دسترس و قابل نگهداری باقی بماند.
