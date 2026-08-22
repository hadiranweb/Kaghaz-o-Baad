# گزارش JavaScript Critical Path و TBT

## تغییرات

Toaster و Sonner در task قبلی پشت `DeferredNotifications` قرار گرفتند و particle canvas پشت `DeferredAmbientParticles` باقی ماند. در این task، importهای broad از creative barrel در `App.tsx` و `Header.tsx` نیز حذف شدند و `MotionProvider` و `EditorialDock` مستقیماً import می‌شوند تا module evaluation غیرضروری کاهش یابد.

هدف این slice کاهش هزینهٔ اجرای JavaScript و نه صرفاً کاهش حجم فایل بود. بنابراین معیار اصلی TBT و سپس LCP/CLS قرار گرفت.

## Build evidence

Shared application chunk پس از تغییر حدود `675.6KB raw` باقی ماند و حدود `243.5KB gzip` است. این نتیجه نشان می‌دهد direct-import cleanup در این build به‌تنهایی chunk بزرگ را کاهش نداده و بخش قابل‌توجهی از آن از global shell، route graph مشترک یا vendorهای shared می‌آید. warning chunk نیز حفظ شده و با `chunkSizeWarningLimit` پنهان نشده است.

## Lighthouse repetition

Production preview با RTT=`150ms`، throughput=`1600Kbps`، CPU slowdown=`4x` و mobile emulation بررسی شد. سه cold و سه warm audit اجرا شد. warm هر بار با profile primed و سپس `--disable-storage-reset` اندازه‌گیری شد.

| Cache | Median LCP | Median CLS | Median TBT | Median Transfer | Median Score |
|---|---:|---:|---:|---:|---:|
| Cold | 5,409ms | 0.0280 | 175ms | 829,688 B | 0.74 |
| Warm | 5,410ms | 0.0280 | 173ms | 829,688 B | 0.74 |

Baseline نزدیک پیشین: LCP حدود `5,411ms`، CLS=`0.028`، TBT حدود `164–165ms` و transfer حدود `829,678B`. بنابراین این slice کاهش قابل‌اثباتی در TBT نشان نمی‌دهد؛ TBT median کمی نوسان دارد و باید به‌عنوان no-regression تلقی شود، نه موفقیت قطعی کاهش TBT.

## Interpretation

Defer کردن notification و particle در مسیر قبلی، transfer و preload را کنترل کرده است؛ اما اجرای initial JavaScript همچنان به shared application graph وابسته است. direct import cleanup نیز از نظر bundle خروجی measurable reduction ایجاد نکرده است. بنابراین bottleneck بعدی احتمالاً module evaluation مربوط به providerها، Header/UI primitives، route metadata یا chunk مشترک است و باید با Chrome DevTools performance trace و source-map attribution بررسی شود.

CLS در حدود `0.028` حفظ شده و LCP candidate همچنان paragraph توضیحی Hero است. هیچ functionality، محتوای قابل‌دسترسی، مسیر RTL/LTR یا fallback reduced-motion حذف نشده است.

## Validation

- targeted ESLint: موفق، بدون error؛
- production build: موفق؛
- SEO prerender: موفق؛
- سه cold و سه warm Lighthouse run: کامل؛
- شش report خام و summary JSON: ذخیره شدند؛
- TBT نتیجه: no-regression، کاهش قطعی اثبات نشد.

## گام بعدی

برای کاهش واقعی TBT باید trace module evaluation روی shared application chunk انجام شود. اولویت‌ها شامل جداکردن providerهای global، بررسی `TooltipProvider` و `AuthProvider` در public shell، attribution long taskها به فایل‌های source، و split کردن utilityهای مشترک است. تا پیش از این trace، افزودن runtime سنگین یا تغییر تصادفی manualChunks توصیه نمی‌شود.
