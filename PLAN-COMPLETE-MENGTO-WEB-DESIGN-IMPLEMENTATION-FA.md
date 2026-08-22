# برنامهٔ کامل پیاده‌سازی دیزاین MengTo برای Kaghaz-o-Baad

## ۱. هدف، دامنه و تعریف موفقیت

هدف این برنامه، اجرای کامل و مرحله‌ای capabilityهای مرتبط با وب از مسیر رسمی `MengTo/Skills/agent-skills/web-design` روی Kaghaz-o-Baad است. اجرای موردنظر **کپی‌کردن هویت، asset، متن یا screenshot منبع نیست**؛ بلکه reuse یا adaptation دقیق رفتار، composition، motion contract و الگوهای فنی سازگار با React 18، TypeScript، Vite، Tailwind و معماری دوزبانهٔ موجود است.

موفقیت زمانی تأیید می‌شود که سایت در desktop و mobile دارای یک زبان بصری منسجم editorial باشد، Homepage یک first viewport کامل و memorable داشته باشد، Archive و Reader واقعاً از interactionهای عمیق استفاده کنند، AboutProject روایت chapter-based داشته باشد و تمام این‌ها در RTL/LTR، keyboard، screen reader، touch، reduced-motion، no-JS و شبکهٔ محدود قابل استفاده بمانند.

## ۲. اصول غیرقابل مذاکره

هر capability پیش از اجرا باید از source اصلی واکشی شود و در provenance manifest ثبت گردد. تصمیم برای هر مورد یکی از `reuse`، `adapt`، `rewrite` یا `reject` خواهد بود. هیچ artwork، لوگو، copy یا هویت بصری اختصاصی MengTo بدون مجوز بازتولید نمی‌شود.

محتوای semantic نباید به animation وابسته باشد. critical text باید پیش از پایان motion قابل خواندن باشد؛ مسیر no-JS باید document کامل ارائه کند؛ reduced-motion باید state نهایی را بلافاصله نشان دهد؛ و pointer، WebGL، smooth scroll و canvas فقط progressive enhancement باشند.

هیچ runtime سنگینی تا زمانی که با trace ارزش قابل اندازه‌گیری ایجاد نکند وارد critical path نمی‌شود. `chunkSizeWarningLimit` افزایش داده نمی‌شود. فقط یک smooth-scroll engine مجاز است و هر resource شامل observer، RAF، worker، texture و event listener باید cleanup کامل داشته باشد.

## ۳. وضعیت مبنا و خروجی‌های موجود

در وضعیت فعلی، MotionProvider، MaskedReveal، StaggerGroup، StaggeredWordReveal، EditorialDock، ArticleShelf state machine، data fallbacks، lazy Markdown editor، read-only Markdown renderer، worker isolation، App-shell reservation و benchmarkهای Lighthouse موجود هستند. این‌ها foundation هستند و در مراحل بعد باید به قرارداد source-level رسمی MengTo نزدیک‌تر و از نظر visual fidelity یکپارچه شوند.

## ۴. فاز صفر — Governance و source mapping

### `phase-00-source-registry`

ابتدا تمام folderهای زیرمجموعهٔ web-design inventory می‌شوند و برای هرکدام source URL، `SKILL.md`، `REFERENCES.md`، capability، مقصد محصول، ریسک مجوز، هزینهٔ runtime و تصمیم اولیه ثبت می‌گردد. capabilityها در خانواده‌های foundation، editorial motion، navigation، pointer, ambient، WebGL، runtime و product UI دسته‌بندی می‌شوند.

خروجی این فاز `docs/MENGTO-WEB-DESIGN-SOURCE-REGISTRY.yaml` و update در `MENGTO-DEEP-PROVENANCE-MANIFEST.yaml` است. معیار پذیرش این است که هر implementation آینده یک source و status روشن داشته باشد.

## ۵. فاز یک — Visual foundation و typography

### `phase-01-foundation-tokens`

توکن‌های color، spacing، radius، border، shadow، blur، type scale، container width، z-index و motion در یک contract واحد تعریف می‌شوند. variantهای فارسی و لاتین، dark/light، high contrast و responsive breakpoint مشخص می‌شوند.

### `phase-01-type-and-serif`

الگوی `book-serif-index` و typography editorial برای heading، kicker، metadata، quote و body adapt می‌شود. font metrics، preload، fallback و line-height برای فارسی و انگلیسی تثبیت می‌شوند تا font swap باعث CLS نشود.

### `phase-01-surface-kit`

`css-border-gradient`، `css-alpha-masking`، `progressive-blur`، `beautiful-shadows` و `container-lines` به primitiveهای قابل استفاده تبدیل می‌شوند: `PaperSurface`، `EditorialFrame`، `MaskedEdge`، `SectionRule` و `DepthShadow`. هر primitive باید focus state و fallback ساده داشته باشد.

معیار پذیرش این فاز، امکان ساخت Homepage، Shelf و AboutProject فقط با token/primitiveهای ثبت‌شده و بدون CSS پراکنده است.

## ۶. فاز دو — Homepage art direction

### `phase-02-hero-static-composition`

Homepage ابتدا به‌صورت static و کامل art-directed می‌شود: visual thesis، Hero focal asset، issue bar، CTA، search، three-path index، section rhythm و footer. در این مرحله animation خاموش است و layout باید بدون JS نیز کامل بماند.

### `phase-02-hero-motion-contract`

`masked-reveal`، `staggered-word-reveal` و `animation-on-scroll` با ترتیب خواندن فارسی/انگلیسی اجرا می‌شوند. semantic name unsplit باقی می‌ماند و decorative spans از screen reader پنهان می‌شوند. Hero LCP هرگز به observer یا animation delay وابسته نمی‌شود.

### `phase-02-ambient-layer`

`atmosphere-background` و `ambient-section-particles` فقط پس از LCP و با idle/deferred boundary اضافه می‌شوند. در touch، reduced-motion، low-power یا WebGL failure نسخهٔ بدون canvas فعال است.

### `phase-02-pointer-depth-spike`

`add-mouse-driven-orbit` و در صورت نیاز `pointer-trail-emitter` به‌صورت spike مستقل بررسی می‌شوند. OrbitControls مجاز نیست. اگر interaction با CSS transform یا تصویر چندلایه قابل دستیابی باشد، Three.js رد می‌شود. خروجی spike شامل before/after trace و تصمیم قبول/رد است.

## ۷. فاز سه — Navigation و page transitions

### `phase-03-editorial-navigation`

EditorialDock، `number-details`، `corner-diagonals`، `corner-lasers` و `framed-grid-layout` برای Header، section index و mobile navigation به یک visual language تبدیل می‌شوند. active، nearby، focused، pressed، touch و disabled stateها مستند می‌شوند.

### `phase-03-route-transition`

یک route transition سبک با حفظ document accessibility ساخته می‌شود. transition نباید route loading را پنهان یا navigation را block کند. focus پس از route change به heading یا مقصد منطقی منتقل می‌شود و reduced-motion مستقیماً state نهایی را render می‌کند.

## ۸. فاز چهار — Archive و Complete Shelf

### `phase-04-shelf-static`

Complete Shelf با paper geometry، cover ratio، spine/edge، metadata hierarchy و scroll-snap تکمیل می‌شود. data fallbackهای title، summary، author، language، date، cover، loading، empty و error به surface وصل می‌شوند.

### `phase-04-shelf-interaction`

state machine کامل `idle → focused → opening → open → reading → closing` با intent cancellation، race protection، pointer capture، keyboard navigation، Escape، focus restoration و deep-link تثبیت می‌شود.

### `phase-04-shelf-enhancement`

`reveal-hover-effect`، `marquee-loop` یا `dither-background` فقط در صورت پشتیبانی از scanning/reading وارد می‌شوند. هیچ effect نباید title یا action را دشوار کند. 3D واقعی فقط پس از CSS baseline و performance comparison بررسی می‌شود.

## ۹. فاز پنج — Reader و page-turn

### `phase-05-reader-static`

Reader یک static reading state کامل برای loading، error، empty و article content دارد. PDF و workerها فقط با intent واقعی ساخته می‌شوند و public reader بدون editor/LiveKit dependencies کار می‌کند.

### `phase-05-page-curl`

fold line، curl geometry، perspective، page shadow، boundary clamp، drag، swipe، keyboard arrows، Home/End و screen-reader page announcement اجرا می‌شوند. در reduced-motion، صفحه بدون curl به state مقصد تغییر می‌کند.

### `phase-05-reader-ambient`

هر ambient cursor/ripple یا paper texture باید subordinate به متن باشد. touch و coarse pointer نسخهٔ ساده دارند و hidden/offscreen reader animation متوقف می‌شود.

## ۱۰. فاز شش — AboutProject و Kage narrative

### `phase-06-chapter-model`

AboutProject به مدل chapter شامل id، title، short label، semantic heading، anchor و progress تبدیل می‌شود. chapter index، scroll progress، active chapter و deep-link keyboard قابل دسترسی خواهند بود.

### `phase-06-story-scenes`

`editorial-portfolio-chapters`، `cinematic-scroll-storytelling`، `scroll-progress-timeline` و در صورت توجیه `pinned scene` در چند صحنهٔ محدود اجرا می‌شوند. هیچ scene نباید با scroll lock یا smooth scroll اجباری مانع خواندن شود.

### `phase-06-static-and-reduced`

برای هر scene، static layout و reduced-motion final state جداگانه تست می‌شود. quote، diagram و CTA باید در HTML/DOM باقی بمانند و بدون JS قابل دنبال‌کردن باشند.

## ۱۱. فاز هفت — Motion runtime انتخابی

### `phase-07-runtime-evaluation`

CSS/IntersectionObserver فعلی با GSAP، ScrollTrigger و Lenis از نظر fidelity، bundle، TBT، cleanup و mobile مقایسه می‌شوند. فقط در صورت عبور از decision matrix، یک engine انتخاب می‌شود.

### `phase-07-runtime-integration`

اگر GSAP/Lenis انتخاب شد، ticker واحد، refresh پس از font/media، lifecycle cleanup، visibility pause، route teardown و reduced-motion bypass پیاده می‌شود. نصب هم‌زمان Lenis و Locomotive یا چند سیستم کنترل‌کنندهٔ یک property ممنوع است.

## ۱۲. فاز هشت — WebGL و interactive spikes

### `phase-08-threejs-hero`

یک spike برای `threejs` یا `webgl-3d-object` با یک مسئولیت روشن اجرا می‌شود: depth، displacement یا texture transition. poster ثابت، DPR cap، offscreen pause، context loss، disposal و failure fallback الزامی است.

### `phase-08-background-and-globe`

`background-grid-webgl`، `globe-gl`، `globe-particles`، `cobejs`، `vantajs`، `unicorn-studio` و `matterjs` به‌صورت گزینه‌های مستقل ارزیابی می‌شوند. فقط یکی از این سیستم‌ها در هر تجربه مجاز است و در صورت عدم ارزش روایی reject می‌شود.

### `phase-08-cursor-effects`

`shader-cursor-trail`، `shaders-cursor-ripples` و `webgl-laser` با pointer fine، DPR cap و no-op fallback بررسی می‌شوند. این effects در mobile، reduced-motion، hidden tab و WebGL failure خاموش هستند.

## ۱۳. فاز نه — Product UI و polish

### `phase-09-product-patterns`

از `landing-page`، `image-first-grid-layout`، `split-layout-technical`، `operational-enterprise-ai` و `product-proof-saas` فقط hierarchy، CTA و information architecture گرفته می‌شود. testimonial جعلی، logo wall، customer proof یا claim بدون داده ممنوع است.

### `phase-09-state-polish`

تمام صفحات باید stateهای loading، empty، error، disabled، hover، focus-visible، active، selected، pressed و offline را داشته باشند. زبان هر state با locale فعلی هماهنگ و برای screen reader قابل اعلام خواهد بود.

## ۱۴. فاز ده — Performance و accessibility hardening

### `phase-10-critical-path`

module graph، providerها، preload، font، CSS، image و workerهای Homepage اندازه‌گیری می‌شوند. PDF، LiveKit، Markdown editor، chart و WebGL از public critical path خارج می‌مانند.

### `phase-10-metrics`

Lighthouse با production preview و mobile simulated Throttled 4G، سه cold و سه warm تکرار می‌شود. median LCP، CLS، TBT، transfer، requests، score و LCP element ثبت می‌گردد. Chrome trace برای long task، INP proxy و layout shift ذخیره می‌شود.

### `phase-10-budgets`

هدف‌های engineering عبارت‌اند از: CLS کمتر از 0.1، عدم بدترشدن TBT بیش از 5٪ در هر feature، LCP median بهتر یا بدون regression و انتقال runtimeهای سنگین به dynamic import. عدد lab INP هرگز به‌عنوان field INP گزارش نمی‌شود.

## ۱۵. فاز یازده — QA و rollout

### `phase-11-automated-tests`

reducerها، state machineها، normalizerها، route transition contract، locale behavior و component fallbackها unit test می‌شوند. برای componentهای تعاملی، keyboard و pointer tests اضافه می‌گردد.

### `phase-11-manual-matrix`

Desktop، mobile، فارسی RTL، انگلیسی LTR، keyboard-only، screen reader، touch، reduced-motion، no-JS، slow network، offline/error و WebGL unavailable بررسی می‌شوند. console error، hydration-like mismatch و focus loss ممنوع است.

### `phase-11-visual-review`

از Homepage، Archive، Reader و AboutProject در viewportهای ثابت screenshot و در صورت نیاز trace گرفته می‌شود. هر screenshot باید با reference contract و نه با تقلید identity مقایسه شود.

### `phase-11-rollout`

هر task یک commit مستقل و provenance update دارد. merge به `main` پس از build، test، performance gate، accessibility sign-off، بررسی license و review دستی انجام می‌شود. قابلیت‌های experimental با feature flag یا branch جدا نگه داشته می‌شوند.

## ۱۶. ترتیب دقیق taskها

| ترتیب | Task ID | خروجی اصلی | وابستگی |
|---:|---|---|---|
| 1 | `phase-00-source-registry` | source registry و provenance matrix | ندارد |
| 2 | `phase-01-foundation-tokens` | design token contract | 1 |
| 3 | `phase-01-type-and-serif` | typography و font metrics | 2 |
| 4 | `phase-01-surface-kit` | paper/frame/mask primitives | 2،3 |
| 5 | `phase-02-hero-static-composition` | static Homepage art direction | 4 |
| 6 | `phase-02-hero-motion-contract` | reveal/stagger contract | 5 |
| 7 | `phase-02-ambient-layer` | deferred ambient enhancement | 6، performance trace |
| 8 | `phase-03-editorial-navigation` | unified navigation states | 4،5 |
| 9 | `phase-03-route-transition` | accessible route transition | 8 |
| 10 | `phase-04-shelf-static` | Complete Shelf surface/data | 4 |
| 11 | `phase-04-shelf-interaction` | full shelf state machine | 10 |
| 12 | `phase-04-shelf-enhancement` | bounded shelf enhancements | 11، performance gate |
| 13 | `phase-05-reader-static` | reader static states | 4 |
| 14 | `phase-05-page-curl` | faithful page curl | 13 |
| 15 | `phase-05-reader-ambient` | optional reader ambient | 14، performance gate |
| 16 | `phase-06-chapter-model` | AboutProject chapters | 4 |
| 17 | `phase-06-story-scenes` | Kage narrative scenes | 16 |
| 18 | `phase-06-static-and-reduced` | no-JS/reduced matrix | 17 |
| 19 | `phase-07-runtime-evaluation` | GSAP/Lenis decision | 6،9،17 |
| 20 | `phase-07-runtime-integration` | one motion engine, if approved | 19 |
| 21 | `phase-08-threejs-hero` | optional WebGL spike | 5،10،14،19 |
| 22 | `phase-08-background-and-globe` | optional visual spikes | 21 |
| 23 | `phase-08-cursor-effects` | optional pointer shaders | 21 |
| 24 | `phase-09-product-patterns` | CTA/info polish | 5،16 |
| 25 | `phase-09-state-polish` | complete state coverage | all public pages |
| 26 | `phase-10-critical-path` | import/preload optimization | all implemented features |
| 27 | `phase-10-metrics` | repeated Lighthouse/Chrome evidence | 26 |
| 28 | `phase-11-automated-tests` | regression suite | all features |
| 29 | `phase-11-manual-matrix` | manual accessibility/device QA | 28 |
| 30 | `phase-11-visual-review` | visual sign-off | 29 |
| 31 | `phase-11-rollout` | merge readiness | 30 |

## ۱۷. Definition of Done هر task

هر task فقط زمانی done است که source و capability reference، تصمیم reuse/adapt/rewrite، API و component contract، fallbackهای RTL/LTR/touch/keyboard/reduced-motion/no-JS، performance impact، تست‌های لازم، screenshot یا trace، provenance update، build موفق و commit مستقل داشته باشد.

## ۱۸. اولین اقدام اجرایی

اولین task برای شروع عملی این برنامه `phase-00-source-registry` است. پس از آن به‌ترتیب `phase-01-foundation-tokens` و `phase-01-type-and-serif` اجرا می‌شوند. هیچ Homepage/WebGL rewrite پیش از نهایی‌شدن foundation و source matrix شروع نمی‌شود.

## ۱۹. منابع رسمی

[1]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design "MengTo Skills Web Design directory"
[2]: https://raw.githubusercontent.com/MengTo/Skills/main/agent-skills/web-design/WEB-DESIGN-SKILLS.md "MengTo Web Design Skills index"
[3]: https://raw.githubusercontent.com/MengTo/Skills/main/agent-skills/web-design/build-awwwards-quality-sites/SKILL.md "Build Awwwards Quality Sites"
[4]: https://raw.githubusercontent.com/MengTo/Skills/main/agent-skills/web-design/cinematic-gsap-lenis-motion-system/SKILL.md "Cinematic GSAP Lenis Motion System"
[5]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/masked-reveal "MengTo masked-reveal skill"
[6]: https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/staggered-word-reveal "MengTo staggered-word-reveal skill"
