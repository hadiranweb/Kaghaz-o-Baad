# برنامهٔ فاز سوم: تکمیل روایت editorial و hardening عملکرد

## هدف فاز

فاز سوم باید پروژه را از «port قابل مشاهدهٔ Sylva و Shelf» به یک **سیستم editorial پایدار، قابل اندازه‌گیری و آمادهٔ توسعهٔ Reader/Narrative** منتقل کند. تمرکز این فاز بر سه محور است: تکمیل stateهای Faithful Sylva که هنوز قراردادی یا ناقص هستند، تبدیل Complete Shelf به یک تجربهٔ آرشیوی کامل با دادهٔ واقعی و fallback استاندارد، و کاهش هزینهٔ لود اولیه و dependencyهای مشترک با اندازه‌گیری قبل/بعد.

این فاز نباید با اضافه‌کردن runtime سنگین، تغییر APIهای backend، حذف محتوای متنی یا وابسته‌کردن تجربه به hover و animation اجرا شود.

## وضعیت مبنا

- branch اصلی کار: `feat/comprehensive-mengto-skills-ui`
- PR هدف: #11
- `StaggeredWordReveal`، `EditorialDock`، `MotionProvider`، `MaskedReveal` و `StaggerGroup` در پروژه وجود دارند.
- `ArticleShelf` stateهای پایه و geometry کاغذی دارد و کارت‌های واقعی مقاله را نمایش می‌دهد.
- vendor splitting برای React، Radix، icons، query، forms، Markdown، charts، date-fns، PDF و LiveKit اعمال شده است.
- بزرگ‌ترین application chunk از 943,914 به 675,855 bytes کاهش یافته، اما shared chunk هنوز حدود 675 KB خام و حدود 240 KB gzip است.
- `markdown-vendor`، `pdf-vendor` و `livekit-vendor` جدا هستند، اما import graph و modulepreload باید دوباره بررسی شوند.
- lint/build موفق‌اند؛ warning Fast Refresh برای export hook از provider و warning chunk بزرگ هنوز باز هستند.

## خروجی‌های قطعی فاز

| خروجی | معیار پایان |
|---|---|
| Sylva interaction contract v2 | state matrix، timing، fallback، keyboard و provenance ثبت‌شده |
| Complete Shelf v2 | state machine کامل، open/close، focus restoration، deep-link و mobile fallback |
| Performance hardening | کاهش measurable در initial critical graph و تفکیک editor/runtimeهای غیرضروری |
| QA matrix | desktop، keyboard، touch، RTL/LTR، reduced-motion و failure states ثبت‌شده |
| گزارش release | benchmark قبل/بعد، screenshots، rollback note و لیست ریسک‌های باقیمانده |

## محور اول — Sylva Faithful v2

### ۱. قرارداد state و timeline

برای Homepage قرارداد صریح زیر تعریف می‌شود:

`idle → preparing → staged-enter → interactive → touch-fallback → reduced-motion`

هر state باید ورودی، خروجی، cleanup، زمان‌بندی، cancel و رفتار در route change داشته باشد. timeline باید با CSS variables و tokenهای `MotionProvider` کار کند و به animationهای پراکندهٔ hard-coded وابسته نباشد.

ترتیب پیشنهادی entrance:

1. brand و issue bar؛
2. kicker و badge؛
3. headline؛
4. paragraph؛
5. CTAها؛
6. illustration و step cards؛
7. ambient layer.

محتوا از ابتدا در DOM باقی می‌ماند و reveal فقط presentation است.

### ۲. Dock/proximity v2

`EditorialDock` باید stateهای `idle`، `nearby`، `focused`، `active` و `touch-fallback` را به‌صورت قابل مشاهده در data attributes یا class contract ارائه کند. pointermove نباید باعث layout read مکرر شود؛ geometry باید cache شود و update با rAF محدود شود. keyboard باید بدون proximity همان active/focus style را داشته باشد. در موبایل و hover-none، dock ثابت و touch-targetها حداقل قابل استفاده باقی بمانند.

موارد پذیرش شامل تغییر سریع route، Escape، focus restoration پس از بازگشت از صفحه، RTL/LTR، tab hidden و قطع pointer است.

### ۳. Ambient و burst

particle/burst فقط با trigger معنادار اجرا می‌شود، count و DPR محدود دارد، در `document.hidden` متوقف می‌شود و هیچ text/CTA را پنهان نمی‌کند. در reduced motion، touch، low-power یا نبود Canvas باید حذف یا به CSS static mark تبدیل شود. اگر آزمایش نشان دهد burst ارزش محصولی ندارد، feature باید حذف شود نه اینکه صرفاً نگه‌داری شود.

## محور دوم — Complete Shelf v2

### ۱. state machine کامل

stateهای قطعی:

`idle → focused → opening → open → reading → closing`

رویدادها شامل `FOCUS_CARD`، `POINTER_DOWN`، `OPEN_SUCCESS`، `OPEN_CANCEL`، `READ_START`، `CLOSE_REQUEST`، `CLOSE_SUCCESS` و `ERROR` خواهند بود. هر transition باید cancellation-safe باشد و کلیک سریع یا navigation تکراری state را خراب نکند.

### ۲. کارت editorial و دادهٔ واقعی

card view model باید این فیلدها را normalize کند: id، slug، title فارسی/انگلیسی، summary، cover، author، language، category، tags، publication date، status و reading href. cover خراب یا خالی باید surface کاغذی و icon fallback داشته باشد. متن title و action نباید فقط با hover قابل مشاهده شود.

### ۳. desktop و mobile

روی desktop، shelf با scroll-snap، keyboard arrows، Home/End، wheel افقی و focus قابل استفاده است. روی mobile، perspective و transformهای سنگین حذف یا محدود می‌شوند و shelf به snap list یا stacked cards تبدیل می‌شود. جهت Arrow و swipe باید بر اساس locale و direction تست شود.

بازشدن card باید shared-layout illusion کنترل‌شده داشته باشد؛ اگر animation یا JavaScript شکست خورد، لینک `/read/:slug` مسیر مرجع باقی می‌ماند. focus پس از بازگشت باید به همان card برگردد.

### ۴. surface و provenance

paper surface با CSS gradient، border، shadow و token ساخته می‌شود. هیچ texture یا artworkی با license نامشخص وارد نمی‌شود. manifest برای هر port جدید source commit، decision، تفاوت معماری و fallback را ثبت می‌کند.

## محور سوم — Performance hardening

### ۱. graph analysis و critical path

گراف import با build manifest یا ابزار تحلیل bundle ثبت می‌شود. باید مشخص شود چرا shared chunk حدود 675 KB تولید می‌کند و چرا Markdown یا dependencyهای editor در modulepreload Homepage دیده می‌شوند. معیار، کاهش graph critical Homepage است، نه صرفاً تغییر نام فایل‌ها.

### ۲. lazy کردن editorها

`@uiw/react-md-editor` در Dashboard، ArticleSlides و LiveRoom باید به مسیرهای مصرف‌کننده محدود شود. برای Dashboard، editor کامل فقط هنگام بازشدن فرم یا tab و با dynamic import لود شود. برای public ArticleSlides و LiveRoom، renderer سبک read-only جدا از editor استفاده شود تا toolbar و editor runtime تحمیل نشود. Markdown renderer باید sanitize و fallback متنی داشته باشد.

### ۳. import hygiene

آیکون‌ها، chartها، date utilities، PDF worker و LiveKit باید فقط در routeهای مصرف‌کننده import شوند. importهای barrel که باعث eager graph می‌شوند بررسی و در صورت نیاز به import مستقیم تبدیل می‌شوند. `modulepreload` خروجی production باید قبل/بعد مقایسه شود.

### ۴. cache و asset policy

hash filenameها حفظ می‌شوند. assetهای بزرگ باید lazy، responsive و دارای width/height باشند. font loading باید `font-display: swap`، subset مناسب و fallback فارسی/لاتین داشته باشد. imageهای hero و card باید از layout shift جلوگیری کنند.

### ۵. measurement gates

Baseline و after شامل موارد زیر است:

| گروه | شاخص |
|---|---|
| Bundle | entry خام/gzip، shared chunks، route chunks، modulepreload |
| Browser | LCP، INP، CLS، TTFB، تعداد requestها |
| Runtime | idle CPU، scripting time، memory، frame drops |
| Device | desktop، mobile، throttled 4G، reduced-motion، hover-none |
| Resilience | API slow/error، broken image، no WebGL، no JS enhancement |

موفقیت فاز زمانی است که critical Homepage کوچک‌تر شود، routeهای Archive/Reader بدون editor غیرضروری لود شوند و هیچ budget جدیدی بدون تصمیم مستند پذیرفته نشود.

## محور چهارم — QA و accessibility

### ماتریس تعاملی

هر مسیر در desktop pointer، keyboard-only، touch/mobile و reduced-motion/low-power بررسی می‌شود. هر دو locale فارسی و انگلیسی با `dir="rtl"` و `dir="ltr"` تست می‌شوند.

### موارد functional

- حرکت سریع بین کارت‌ها و جلوگیری از transition race؛
- Enter برای بازکردن action card؛
- Home/End و Arrow direction؛
- Escape و focus restoration؛
- route reload روی deep-link؛
- empty/loading/error archive؛
- نبود cover، زبان ناقص و metadata ناقص؛
- تغییر orientation و safe-area؛
- tab hidden و بازگشت به tab؛
- خاموش‌شدن کامل animation در reduced motion.

### موارد accessibility

landmark و heading order، focus ring، contrast، label و `aria-describedby` یکتا، `aria-current`، `aria-live` محدود، عدم وابستگی به hover و مسیر کامل بدون animation بررسی می‌شوند.

## ترتیب branch و commit

1. `phase3-sylva-state-contract`
2. `phase3-shelf-state-machine`
3. `phase3-shelf-data-fallbacks`
4. `phase3-lazy-markdown-editor`
5. `phase3-import-graph-hygiene`
6. `phase3-performance-qa`
7. `phase3-report-rollout`

هر branch باید کوچک، قابل cherry-pick، دارای build/lint، screenshot یا preview، QA note و rollback note باشد. تغییرات روی branch اصلی feature انجام می‌شوند و PR #11 مقصد review باقی می‌ماند.

## ریسک‌ها و تصمیم‌های باز

| ریسک | راهکار |
|---|---|
| data API در QA خالی است | fixture فقط برای QA، بدون seed کردن production |
| shared chunk همچنان بزرگ می‌ماند | import graph trace و lazy boundary؛ افزایش warning limit ممنوع |
| shared-layout با متن بلند ناپایدار است | animation فقط روی surface محدود و fallback لینک/متن |
| RTL با perspective و arrow ناسازگار می‌شود | direction-aware transform و تست مستقل هر locale |
| editor lazy باعث delay در فرم می‌شود | skeleton مشخص، prefetch فقط پس از intent کاربر |
| component جدید warning Fast Refresh می‌دهد | context و hook به فایل‌های جدا منتقل شوند |
| اجرای WebGL وسوسه‌انگیز است | تا عبور performance gate در این فاز وارد production نمی‌شود |

## معیار پایان فاز سوم

فاز زمانی بسته می‌شود که Sylva و Shelf state contract نهایی، Archive در حالت دادهٔ واقعی و fallback، critical path اندازه‌گیری‌شده، editorهای غیرضروری lazy، QA matrix تکمیل و گزارش before/after به branch و PR push شده باشد. Reader page-curl و Kage narrative در فاز بعدی باقی می‌مانند و نباید scope این فاز را منحرف کنند.
