# گزارش LCP Optimization

## Baseline

Homepage در simulated Throttled 4G دارای LCP cold حدود 28.8 ثانیه و warm حدود 2.4 ثانیه بود. LCP candidate پاراگراف توضیحی Hero است، نه تصویر:

```text
div.container > div.max-w-2xl > p.kb-masked-reveal > span.kb-masked-reveal__content
```

این اختلاف شدید cold/warm نشان می‌دهد هزینهٔ اصلی در initial transfer، module evaluation و React bootstrap است، نه TTFB.

## تغییرات اعمال‌شده

- preloadهای فارسی به fontهای same-origin منتقل شدند؛
- فقط regular و bold بالای fold preload می‌شوند؛
- preloadهای `markdown-vendor`، PDF و LiveKit از dependencyهای modulepreload حذف شدند؛
- route-level vendor chunks حفظ شدند تا authoring/live/reader هزینهٔ خود را در مسیر مربوطه پرداخت کنند؛
- `App` و `main` دارای reservation ارتفاع اولیه هستند؛
- critical Hero از reveal observer وابسته نیست؛
- LCP element و bootstrap trace با اسکریپت‌های مستقل قابل تکرار ثبت شدند.

## Build evidence

در build نهایی Homepage فقط این vendorها در modulepreload باقی می‌مانند:

- React vendor؛
- Radix vendor؛
- icons vendor؛
- TanStack Query vendor.

`markdown-vendor` با حجم حدود 371KB، PDF vendor با حدود 364KB و LiveKit vendor با حدود 665KB در initial modulepreload نیستند. بزرگ‌ترین shared application chunk حدود 672.6KB خام و 242.4KB gzip باقی است؛ این bottleneck بعدی است و با warning مصنوعی مخفی نشده است.

## Validation

- production build: موفق؛
- SEO prerender: موفق، ۱۵ route عمومی و ۳ article record؛
- ESLint کد TS/TSX: موفق؛
- CSS توسط ESLint نادیده گرفته شد و warning آن non-blocking است؛
- preload graph: بررسی شد و vendorهای سنگین public از preload حذف شدند؛
- فونت‌های فارسی same-origin در HTML درج شدند.

## Remaining work

LCP cold هنوز باید با build preview و حداقل سه تکرار median اندازه‌گیری شود. render delay بالا نشان می‌دهد shared application chunk و provider bootstrap هنوز باید trace شوند. اولویت بعدی عبارت است از: جداسازی Toaster/Sonner، کاهش importهای global در App، defer کردن particle/motion غیرcritical، و بررسی اینکه چرا CSS/Latin font stylesheet خارجی در critical graph باقی مانده است.
