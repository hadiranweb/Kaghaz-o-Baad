# برنامهٔ LCP Optimization و کاهش Critical Loading Path

## هدف

کاهش زمان LCP و زمان بارگذاری اولیهٔ Homepage در شبکهٔ simulated Throttled 4G، بدون آسیب به RTL/LTR، دسترسی‌پذیری، progressive enhancement، Faithful Sylva motion یا lazy boundaries فعلی.

## شواهد مبنا

در benchmark فعلی، LCP Homepage روی paragraph توضیحی Hero قرار دارد:

```text
div.container > div.max-w-2xl > p.kb-masked-reveal > span.kb-masked-reveal__content
```

LCP cold حدود 28.8 ثانیه، warm حدود 2.4 ثانیه، TBT حدود 280 تا 310 میلی‌ثانیه و transfer cold حدود 4.8MiB است. این اختلاف نشان می‌دهد critical path بیشتر از server latency، تحت تأثیر initial transfer، app bootstrap و render delay قرار دارد.

## مراحل اجرایی

### فاز ۱ — تفکیک LCP phases و bootstrap trace

با Chrome CDP trace، زمان‌های TTFB، document response، CSS/font readiness، module evaluation، React mount، first paint، FCP و LCP ثبت می‌شوند. LCP candidate و تمام long taskهای پیش از LCP باید با source/module attribution ذخیره شوند. معیار پذیرش این فاز، داشتن trace قابل تکرار برای cold و warm و تعیین دقیق سهم bootstrap از render delay است.

### فاز ۲ — کاهش critical HTML/CSS و font cost

HTML head از preloadهای غیرضروری پاک می‌شود. فقط font weight موردنیاز بالای fold preload خواهد شد. CSS critical مربوط به body، Header، Hero و LCP surface باید قبل از stylesheetهای غیرcritical آماده باشد. preload تنها برای assetهایی استفاده می‌شود که واقعاً در اولین viewport مصرف می‌شوند؛ از preload بیش‌ازحد و duplicate fetch جلوگیری می‌شود.

### فاز ۳ — حذف runtimeهای غیرضروری از Homepage

import graph Homepage برای هر dependency بررسی می‌شود. هر component تزئینی مانند particle canvas، motion observer، icon group و route metadata که برای اولین paint ضروری نیست، به بعد از LCP یا `requestIdleCallback` منتقل می‌شود. هیچ dependency سنگین PDF، LiveKit، Markdown editor یا dashboard نباید در critical graph باقی بماند. رفتار بدون JavaScript و reduced-motion باید مستقل از این defer کار کند.

### فاز ۴ — LCP-first rendering در Hero

Hero heading و paragraph باید در اولین render قابل مشاهده باشند. animationهای presentation-only، masked reveal، blur و staged entrance روی LCP candidate اعمال نمی‌شوند. art و search geometry با ابعاد ثابت باقی می‌مانند. برای image/illustration واقعی، `width`، `height`، `aspect-ratio` و در صورت مصرف اولین viewport، preload محدود و قابل‌توجیه اضافه می‌شود.

### فاز ۵ — route shell و data readiness

بررسی می‌شود که `PublicSeoRoute`، `LanguageProvider`، `MotionProvider`، `AuthProvider` و Query setup پیش از paint چه هزینه‌ای دارند. providerهایی که برای Homepage ضروری نیستند باید lazy، deferred یا از مسیر initial render خارج شوند، مشروط بر اینکه auth، locale و SEO دچار regression نشوند. هیچ fetch غیرضروری نباید LCP را block کند؛ search suggestions باید کاملاً پس از input باقی بماند.

### فاز ۶ — اندازه‌گیری before/after و regression gates

Lighthouse با cold و warm cache حداقل سه بار برای Homepage اجرا می‌شود و median گزارش خواهد شد. معیار هدف اولیه: کاهش LCP cold حداقل 20٪، کاهش TBT حداقل 15٪، حفظ CLS زیر 0.1 و حفظ warm LCP زیر 2.5s. سپس Archive و Reader برای regression بررسی می‌شوند. INP lab به‌عنوان INP واقعی گزارش نمی‌شود؛ فقط interaction trace به‌عنوان proxy نگه داشته می‌شود.

## روش تست

- production build با assetهای hash شده؛
- Lighthouse mobile simulated Throttled 4G با RTT=150ms، throughput=1600Kbps و CPU slowdown=4x؛
- cold profile جدید و warm profile پایدار؛
- Chrome trace برای bootstrap و layout-shift؛
- بررسی `modulepreload` و network waterfall؛
- تست keyboard، reduced-motion، no-JS fallback و RTL/LTR؛
- اجرای `pnpm test`، ESLint و SEO prerender پس از هر slice.

## تصمیم‌های اجرایی

افزایش `chunkSizeWarningLimit` ممنوع است. استفاده از GSAP، Three.js یا runtime جدید تا زمان اثبات نیاز در trace ممنوع است. LCP باید با ساده‌سازی critical graph حل شود، نه با حذف محتوای قابل دسترس یا پنهان‌کردن آن از audit.

## ریسک‌ها و فرض‌ها

Lighthouse local ممکن است به‌علت تفاوت dev server، browser cache و remote Latin fonts نوسان داشته باشد؛ بنابراین median و trace خام هر دو ذخیره می‌شوند. LCP بسیار بالا در cold audit ممکن است از bootstrap اپ یا محدودیت sandbox ناشی شود و باید با browser trace تفکیک شود. هر تغییر provider باید با routeهای authenticated و public بررسی شود.

## خروجی‌های مورد انتظار

- `scripts/trace-lcp-bootstrap.mjs`؛
- گزارش before/after در `reports/lighthouse-2026-08-22/REPORT-LCP-OPTIMIZATION-FA.md`؛
- JSONهای raw برای trace و Lighthouse؛
- تغییرات کوچک و قابل review در critical path؛
- commit مستقل روی `feat/comprehensive-mengto-skills-ui` و push به PR #11.
