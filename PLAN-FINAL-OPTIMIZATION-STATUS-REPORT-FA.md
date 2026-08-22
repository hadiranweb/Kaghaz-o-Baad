# برنامهٔ تهیهٔ گزارش نهایی وضعیت فازهای بهینه‌سازی

## هدف

تهیهٔ یک گزارش نهایی و قابل استناد از وضعیت تمام فازهای roadmap بهینه‌سازی و port عمیق MengTo برای پروژهٔ کاغذ و باد، با تفکیک دقیق بین کارهای تکمیل‌شده، کارهای جزئی، کارهای در انتظار، شواهد repository، تست‌ها، benchmarkها و ریسک‌های باز.

## منابع مبنا

گزارش از این منابع read-only تهیه خواهد شد:

- `PLAN-DEEP-MENGTO-PORT-FA.md` برای roadmap مادر و اصول معماری؛
- `PLAN-NEXT-MENGTO-DESIGN-ENRICHMENT-FA.md` برای ترتیب enrichment؛
- `PLAN-PHASE-3-DESIGN-PERFORMANCE-HARDENING-FA.md` برای taskهای فاز سوم و معیار پایان؛
- `docs/PERFORMANCE-BENCHMARK-CHUNK-OPTIMIZATION-FA.md` برای اعداد bundle و HTTP؛
- `docs/MENGTO-DEEP-PROVENANCE-MANIFEST.yaml` برای source، license، decision و provenance؛
- وضعیت branch و تاریخچهٔ commit برای شواهد اجرایی؛
- فایل‌های تست `shelf-state.test.ts` و خروجی lint/build برای شواهد validation.

## ساختار گزارش نهایی

### ۱. خلاصهٔ مدیریتی

وضعیت کلی پروژه، میزان تحقق roadmap، branch/PR و مهم‌ترین دستاوردهای قابل تحویل.

### ۲. جدول وضعیت تمام فازها

برای فازهای صفر تا ده roadmap مادر و taskهای فاز سوم، ستون‌های زیر ثبت می‌شود:

| فاز | هدف | وضعیت | خروجی واقعی | شواهد | gap/ریسک | اقدام بعدی |
|---|---|---|---|---|---|---|

وضعیت‌ها فقط یکی از `تکمیل‌شده`، `تکمیل جزئی`، `در انتظار` یا `خارج از scope` خواهند بود.

### ۳. Design و interaction

وضعیت `StaggeredWordReveal`، `EditorialDock`، MotionProvider، MaskedReveal، StaggerGroup، Shelf geometry، state machine و fallbackهای RTL/LTR، keyboard، touch، reduced-motion و progressive enhancement گزارش می‌شود.

### ۴. Archive و داده

وضعیت state machine آرشیو، reducer، تست‌های unit، view model نرمال‌شده، bilingual fallback، cover fallback، author/date/language fallback، empty/loading/error و deep-link استاندارد بررسی می‌شود. هر قابلیتی که هنوز فقط در قرارداد یا CSS باشد از implementation کامل جدا می‌شود.

### ۵. Performance و bundle

اعداد before/after chunk، entry، gzip، route chunks، modulepreload و HTTP baseline از گزارش موجود استخراج می‌شود. سپس مشخص می‌شود کدام بهینه‌سازی‌ها واقعاً اعمال شده‌اند و کدام موارد هنوز نیازمند lazy کردن Markdown editor، trace import graph، Lighthouse و RUM هستند.

### ۶. QA و accessibility

تست‌های موجود، lint/build، browser preview و محدودیت دادهٔ واقعی Archive ثبت می‌شود. مواردی که هنوز تست رسمی ندارند، مانند mobile throttling، screen reader، Lighthouse، broken image matrix و fixture data، در جدول gap باقی می‌مانند.

### ۷. Provenance و license

منابع MengTo، commitهای pin‌شده، تصمیم reuse/adapt/port/experiment/exclude و وضعیت license بررسی می‌شوند. هر منبعی که license آن verify نشده، به‌عنوان ریسک باز باقی می‌ماند.

### ۸. وضعیت branch و rollout

commitهای کلیدی، branch `feat/comprehensive-mengto-skills-ui`، PR #11، فایل‌های untracked مرتبط و تصمیم merge/rollout گزارش می‌شوند. هیچ ادعای merge به main بدون شواهد repository مطرح نمی‌شود.

### ۹. backlog اولویت‌بندی‌شده

Backlog بر اساس اثر و ریسک مرتب می‌شود:

1. `phase3-lazy-markdown-editor`؛
2. `phase3-import-graph-hygiene`؛
3. `phase3-performance-qa` با Lighthouse و throttled mobile؛
4. تکمیل fixture و accessibility matrix آرشیو؛
5. سپس Reader Sketchbook page-curl؛
6. سپس Kage DOM narrative؛
7. در نهایت runtime spikes اختیاری.

## معیار صحت گزارش

گزارش باید بین «در سند تعریف‌شده» و «در کد اجراشده» تفاوت بگذارد، همهٔ اعداد را با منبع فایل یا commit همراه کند، warningها را پنهان نکند، محدودیت نبود دادهٔ Archive را صریح ثبت کند و برای هر فاز یک اقدام بعدی قابل اجرا ارائه دهد.

## خروجی مورد انتظار

یک فایل Markdown فارسی با جدول‌های وضعیت، جدول benchmark، timeline commitها، ماتریس QA، ریسک‌ها، backlog بعدی و بخش References داخلی به فایل‌های repository. در صورت نیاز، screenshotهای preview و logهای test/build به‌عنوان پیوست گزارش ارائه می‌شوند.

## ریسک‌ها و فرض‌ها

- «تمام فازها» به معنی فازهای roadmap مادر به‌علاوهٔ taskهای فاز سوم است، نه ادعای تکمیل فازهایی که هنوز در انتظارند.
- benchmarkهای localhost به‌عنوان baseline داخلی گزارش می‌شوند و با معیار production یا دستگاه واقعی اشتباه گرفته نمی‌شوند.
- وضعیت branch از آخرین commit موجود در workspace استخراج می‌شود.
- گزارش در همین workspace نوشته می‌شود و در صورت تأیید، commit/push جداگانه خواهد داشت.
