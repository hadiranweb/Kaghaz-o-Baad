# گزارش نهایی وضعیت فازهای roadmap بهینه‌سازی و port عمیق MengTo

**پروژه:** کاغذ و باد — `hadiranweb/Kaghaz-o-Baad`  
**Branch فعال:** `feat/comprehensive-mengto-skills-ui`  
**PR هدف:** #11  
**آخرین commit ثبت‌شده:** `76873f7 — feat: add shelf data fallbacks and state tests`

## خلاصهٔ مدیریتی

پروژه از یک بازطراحی editorial اولیه به یک لایهٔ تعاملی قابل نگهداری برای Homepage، navigation و Archive منتقل شده است. بخش‌های قابل تحویل فعلی شامل port واقعی `StaggeredWordReveal` و `EditorialDock`، foundation مشترک motion، state contract برای dock، state machine مستقل Shelf، geometry کاغذی، view model نرمال‌شدهٔ مقالات، fallbackهای دوزبانه و تست‌های unit برای reducer است.

با این حال، roadmap مادر هنوز به‌طور کامل بسته نشده است. Reader در وضعیت page-curl پایه و gesture قرار دارد، اما engine کامل Sketchbook؛ AboutProject در وضعیت chapter/progress اولیه، اما narrative کامل Kage؛ و runtimeهای GSAP، Lenis و WebGL هنوز در وضعیت آزمایشی یا در انتظار هستند. بنابراین وضعیت کلی را باید **تکمیل جزئی با foundation قابل اتکا برای ادامهٔ توسعه** دانست، نه آمادهٔ merge نهایی به `main`.

> معیار این گزارش تفکیک بین «در سند تعریف‌شده»، «در کد اجراشده» و «در production/QA اثبات‌شده» است.

## وضعیت فازهای roadmap مادر

| فاز | هدف | وضعیت | شواهد موجود | gap اصلی | اقدام بعدی |
|---|---|---|---|---|---|
| صفر | baseline، dependency map، asset inventory و provenance | تکمیل جزئی | `MENGTO-DEEP-PROVENANCE-MANIFEST.yaml` و commitهای pin‌شده برای Skills، Kage، Shelf و Sketchbook | Sylva در manifest clone نشده و license چند منبع هنوز باید verify شود | تکمیل provenance و license matrix |
| یک | interaction layer و motion primitives مشترک | تکمیل جزئیِ قوی | `MotionProvider`، `MotionContext`، `MaskedReveal`، `StaggerGroup`، hooks موجود | `ProgressRail`، `LayeredSurface` و `FallbackFrame` به‌عنوان سیستم عمومی کامل نشده‌اند | تکمیل primitive catalog و fixture route |
| دو | port عمیق Sylva در Home/navigation | تکمیل جزئیِ قوی | `StaggeredWordReveal`، `EditorialDock`، proximity cache، rAF، stateهای dock، fallback touch/reduced-motion | staged timeline کامل Homepage و particle burst state contract هنوز کامل نیست | `phase3-sylva-state-contract` تکمیل شده؛ hardening و QA آن ادامه یابد |
| سه | Complete Shelf در Archive | تکمیل جزئیِ رو به تکمیل | reducer مستقل، stateهای Shelf، geometry paper surface، deep-link استاندارد، normalized view model، cover fallback | close/read transition کامل، fixture داده‌ای و full browser matrix باقی است | اجرای `phase3-shelf-data-fallbacks` تکمیل‌شده و سپس QA/fixture |
| چهار | Reader مبتنی بر Sketchbook و page curl | تکمیل جزئی | دادهٔ واقعی مقاله/اسلاید، drag/curl پایه، swipe mobile، state machine اولیه | fold line، perspective، shadow/cancellation کامل و دو virtual page پایدار هنوز باقی است | آغاز Reader curl engine پس از بسته‌شدن Archive |
| پنج | Kage narrative و chapter system | تکمیل جزئی/در انتظار توسعهٔ اصلی | `ScrollChapterProgress` و AboutProject موجود است | scene schema، chapter completion، DOM narrative کامل و WebGL spike هنوز انجام نشده | ساخت `narrative-kage-dom` بدون WebGL ابتدا |
| شش | خانوادهٔ Skills خوانایی، editorial و atmosphere | تکمیل جزئی | چند Skill به‌صورت adopted/adapted و provenance ثبت شده‌اند | ۸۸ Skill هنوز به component/fixture مستقل تبدیل نشده‌اند؛ برخی فقط reference هستند | اولویت‌بندی بر اساس value و ساخت contract برای هر گروه |
| هفت | Live و Media visual states | در انتظار/تکمیل جزئی | LiveKit، Media و view modelهای فعلی وجود دارند | tokenهای `scheduled/live/ended/recorded`، timeline مشترک و glow state production-grade کامل نشده‌اند | اجرای `live-media-visual-states` پس از Reader |
| هشت | spikeهای GSAP، Lenis و WebGL | در انتظار | تصمیم معماری برای route-level lazy و feature flag ثبت شده است | هیچ spike کامل با benchmark CPU/GPU/frame budget تحویل نشده است | اجرای spikeهای جداگانه فقط پس از baseline Lighthouse |
| نه | QA، accessibility و performance matrix | تکمیل جزئی | lint/build موفق، browser preview، تست reducer و fallbackهای کدشده | Lighthouse، throttled mobile، screen reader، fixture داده‌ای و matrix کامل هنوز اجرا نشده‌اند | ساخت QA matrix خودکار و manual checklist |
| ده | rollout و تحویل branchهای کوچک | تکمیل جزئی | branch فعال، PR #11، commits کوچک و reportهای مستقل | merge به main و rollout feature-flagged هنوز انجام نشده است | review، QA نهایی و rollout opt-in |

## وضعیت taskهای فاز سوم

| Task | وضعیت | خروجی |
|---|---|---|
| `phase3-sylva-state-contract` | تکمیل‌شده | stateهای `idle/nearby/focused/active/touch-fallback`، geometry cache، rAF، ResizeObserver، cleanup و fallbackها |
| `phase3-shelf-state-machine` | تکمیل‌شده | reducer مستقل، eventها، intentId، cancellation، pointer capture، keyboard path و aria status |
| `phase3-shelf-data-fallbacks` | تکمیل‌شدهٔ اولیه | `normalizeShelfArticle`، title/summary/author/date/language fallback، cover fallback و ابعاد ثابت تصویر |
| `phase3-lazy-markdown-editor` | در انتظار | editor هنوز باید به consumer route محدود و read-only renderer سبک جدا شود |
| `phase3-import-graph-hygiene` | تکمیل جزئی | vendor splitting اعمال شده، اما علت shared chunk حدود 675 KB باید trace شود |
| `phase3-performance-qa` | در انتظار | benchmark localhost موجود؛ Lighthouse و mobile throttling باقی است |
| `phase3-report-rollout` | در حال انجام | این گزارش و مستندات benchmark آماده شده‌اند؛ rollout هنوز انجام نشده است |

## دستاوردهای پیاده‌سازی‌شده

### Sylva و Homepage

`EditorialDock` از محاسبهٔ geometry در render خارج شده و با geometry cache و یک animation frame مشترک کار می‌کند. pointer movement فقط مختصات را ثبت می‌کند و stateهای nearby و touch fallback را فعال می‌کند. keyboard focus، active route، `aria-current`، RTL/LTR و reduced-motion مسیرهای مستقل دارند.

`MotionProvider` و `MotionContext` قرارداد مشترک timing، visibility و reduced-motion را فراهم می‌کنند. `MaskedReveal` متن را از DOM حذف نمی‌کند و `StaggerGroup` برای staged entrance استفاده می‌شود. Homepage نیز از revealهای جدید در kicker، badge، paragraph و CTAها استفاده می‌کند.

### Archive و Shelf

`ArticleShelf` دارای reducer مستقل با eventهای صریح است. `OPEN_SUCCESS` فقط زمانی پذیرفته می‌شود که card هنوز در state opening معتبر باشد؛ به این ترتیب transitionهای stale و کلیک‌های سریع کمتر باعث corruption می‌شوند. pointer capture، تشخیص حرکت، Escape، Enter، Home/End و Arrow direction در آن پوشش داده شده‌اند.

Geometry کاغذی شامل perspective، translateZ، rotation محدود، shadow و mobile/reduced-motion fallback است. `normalizeShelfArticle` برای دادهٔ ناقص فارسی/انگلیسی، عنوان و خلاصهٔ fallback، نویسندهٔ عمومی، تاریخ ناموجود، label زبان و cover خالی خروجی پایدار تولید می‌کند.

### تست

فایل `src/components/creative/shelf-state.test.ts` شامل ۶ تست مستقل است و آخرین اجرای ثبت‌شده چنین نتیجه‌ای داشته است:

```text
Test Files  1 passed (1)
Tests       6 passed (6)
```

این تست‌ها reducer و race protection را پوشش می‌دهند؛ تست component در DOM، screen reader و gesture واقعی هنوز باید اضافه شود.

## وضعیت performance و bundle

Vendor splitting برای React/Router، Radix، icons، query، forms/Zod، Markdown، charts، date-fns، PDF و LiveKit اعمال شده است. application chunk اصلی از **943,914 bytes** به **675,855 bytes** کاهش یافت؛ یعنی حدود **28.4٪ کاهش خام** در همان مقایسه. بعد از تغییر، entry اصلی حدود **111,637 bytes خام و 33,139 bytes gzip** بود.

| شاخص | وضعیت فعلی |
|---|---:|
| Homepage entry gzip | 33,139 B |
| shared chunk gzip | 239,933 B |
| Homepage local HTTP total | 0.006021 s |
| `/read` local HTTP total | 0.003779 s |
| LiveKit vendor خام | 665,477 B |
| Markdown vendor خام | 382,981 B |
| PDF vendor خام | 364,166 B |

این اعداد baseline داخلی sandbox هستند و معادل LCP/INP/CLS در production نیستند. هشدار chunk بزرگ همچنان وجود دارد و عمداً با افزایش `chunkSizeWarningLimit` پنهان نشده است. مهم‌ترین gap عملکردی، shared chunk حدود 675 KB خام و احتمال preload شدن dependencyهای Markdown است.

## وضعیت accessibility و progressive enhancement

مسیرهای keyboard برای dock و shelf، focus ring، `aria-current`، `aria-describedby` یکتا، `aria-live` محدود، reduced-motion و touch fallback در کد وجود دارند. لینک استاندارد `/read/:slug` همچنان مسیر مرجع بازکردن مقاله است و animation برای ارائهٔ محتوا ضروری نیست.

موارد زیر هنوز به‌صورت رسمی و سراسری sign-off نشده‌اند: تست screen reader، contrast با هر دو theme، orientation و safe-area، drag cancellation روی دستگاه واقعی، keyboard-only end-to-end، failure تصویر در browser و نبود JavaScript در کل مسیر Archive.

## Provenance و license

Skills با commit `4c716b516b6b0143f3037631306b3730d2832344` و MIT مشاهده‌شده در manifest ثبت شده است. Kage، Complete Shelf و Sketchbook commitهای مشخص دارند، اما وضعیت license مستقیم و امکان reuse asset/code آن‌ها هنوز باید verify شود. Sylva در manifest با وضعیت `not-cloned-in-current-workspace` باقی مانده است.

نتیجهٔ عملی این است که implementationهای فعلی عمدتاً رفتار را port می‌کنند و از کپی artwork یا texture با مجوز نامشخص پرهیز شده است. پیش از هر reuse مستقیم asset یا source file باید manifest به‌روزرسانی شود.

## Timeline commitهای کلیدی

| Commit | دستاورد |
|---|---|
| `1f1b0bf` | بازطراحی Homepage و editorial navigation |
| `c059274` | port `StaggeredWordReveal` |
| `c6fc329` | port `EditorialDock` مبتنی بر proximity |
| `e4c89c6` | shared motion foundation و masked reveal |
| `e4c4334` | Shelf geometry و vendor splitting |
| `899bd34` | benchmark و گزارش chunk optimization |
| `33e4df9` و `ac17d8e` | formalization قرارداد Sylva و motion context boundaries |
| `d6290e6` | formalization Shelf state machine |
| `76873f7` | تست‌های state machine و data fallbacks |

تمام این commits روی `feat/comprehensive-mengto-skills-ui` قرار دارند. merge به `main` در شواهد فعلی ثبت نشده است.

## ریسک‌ها و محدودیت‌های مهم

| ریسک | اثر | راهکار |
|---|---|---|
| دادهٔ Archive در بعضی previewها خالی است | geometry card با دادهٔ واقعی کامل sign-off نشده | fixture جداگانهٔ QA، بدون seed production |
| shared chunk بزرگ باقی مانده | هزینهٔ اولیه و preload بالقوه | lazy کردن editor، trace import graph، بررسی modulepreload |
| Markdown editor سنگین است | تحمیل dependency به مسیرهای public | editor کامل فقط Dashboard؛ renderer read-only برای Reader/Live |
| page curl روی متن بلند ناپایدار است | خوانایی و accessibility آسیب می‌بیند | curl روی surface محدود، fallback متن اصلی |
| license منابع مرجع کامل verify نشده | ریسک حقوقی و provenance | عدم کپی مستقیم تا verify شدن |
| WebGL/GSAP/Lenis | افزایش CPU/GPU و complexity | spike route-level و feature flag، نه production پیش‌فرض |

## backlog اولویت‌دار بعدی

### اولویت صفر: بستن فاز سوم عملکردی

۱. اجرای `phase3-lazy-markdown-editor`؛ ۲. trace دقیق shared chunk و modulepreload؛ ۳. اجرای Lighthouse desktop/mobile و throttled 4G؛ ۴. افزودن fixture دادهٔ Archive؛ ۵. تست component و accessibility برای Shelf؛ ۶. رفع هر warning باقی‌مانده و ثبت before/after نهایی.

### اولویت یک: تکمیل Reader

ساخت `reader-sketchbook-curl-v2` با دو virtual page، fold line، shadow، perspective، velocity، cancellation و edge resistance؛ بدون حذف fallback متن و با حفظ data view model فعلی.

### اولویت دو: Kage DOM narrative

ساخت schema chapter، progress rail، scene boundaries و focus restoration با DOM/CSS. WebGL تا زمانی که benchmark نشان ندهد ارزش غیرقابل‌جایگزین دارد، وارد production نشود.

### اولویت سه: Live/Media states

اتصال visual stateها به backend واقعی، labelهای متنی، progress مشترک و lazy boundaries موجود.

## تصمیم rollout

وضعیت فعلی برای **review داخلی و QA opt-in** مناسب است، اما برای merge نهایی به `main` هنوز زود است. پیش‌شرط merge عبارت است از اجرای lazy Markdown editor، تکمیل performance matrix، fixture Archive، browser accessibility QA و verify شدن provenance/licence منابعی که قرار است مستقیم reuse شوند.

## References داخلی

[1]: `PLAN-DEEP-MENGTO-PORT-FA.md` — roadmap مادر port عمیق MengTo.  
[2]: `PLAN-NEXT-MENGTO-DESIGN-ENRICHMENT-FA.md` — ترتیب enrichment و component contractها.  
[3]: `PLAN-PHASE-3-DESIGN-PERFORMANCE-HARDENING-FA.md` — taskهای فاز سوم و معیار پایان.  
[4]: `docs/PERFORMANCE-BENCHMARK-CHUNK-OPTIMIZATION-FA.md` — benchmark bundle و HTTP.  
[5]: `docs/MENGTO-DEEP-PROVENANCE-MANIFEST.yaml` — source commit و تصمیم provenance.  
[6]: `src/components/creative/shelf-state.test.ts` — تست‌های reducer و transitionهای Shelf.
