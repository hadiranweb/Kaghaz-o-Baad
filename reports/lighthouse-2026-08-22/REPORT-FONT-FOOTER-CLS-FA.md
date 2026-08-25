# گزارش اصلاح font و footer attribution برای CLS

## تغییرات اعمال‌شده

فونت فارسی مورد استفادهٔ `IRANSharp` از CDNهای متعدد به فایل‌های self-hosted دقیق Vazirmatn منتقل شد:

- `public/fonts/Vazirmatn-Light.woff2`
- `public/fonts/Vazirmatn-Regular.woff2`
- `public/fonts/Vazirmatn-Bold.woff2`

در `index.html` فقط وزن‌های regular و bold که برای critical content لازم‌اند preload می‌شوند. درخواست‌های تکراری Google Fonts و stylesheet خارجی Vazirmatn حذف شدند. این کار cross-origin font race و font swap attribution را از مسیر فارسی حذف می‌کند.

Footer با `min-height` پایدار و layout دوطرفهٔ موجود حفظ شد تا تغییر وزن، locale یا دیررسیدن font باعث تغییر ارتفاع کلی نشود. `MaskedReveal` نیز قرارداد `disabled` واقعی دارد تا critical content به observer وابسته نباشد.

## اندازه‌گیری نهایی

| اجرا | Performance | LCP | CLS | TBT | Transfer | Requests |
|---|---:|---:|---:|---:|---:|---:|
| Homepage cold | 0.45 | 28.7s | 0.123 | 280ms | 4,818 KiB | 89 |
| Homepage warm | 0.86 | 2.4s | 0.123 | 310ms | 8 KiB | 89 |

LCP element در هر دو اجرا همان paragraph توضیحی Hero باقی ماند:

```text
div.container > div.max-w-2xl > p.kb-masked-reveal > span.kb-masked-reveal__content
```

## تفسیر دقیق

self-host کردن fontها و preload باعث حذف منابع تکراری و پایدارتر شدن font path شد، اما CLS audit در اجرای Lighthouse هنوز مقدار `0.123` را گزارش می‌کند. attribution اصلی همچنان خود footer است و باید به‌عنوان **remaining open gate** ثبت شود؛ این task نباید ادعا کند CLS به صفر رسیده است.

علت محتمل این است که footer به‌صورت یک عنصر کامل پس از lazy route/Suspense و تغییر ارتفاع main وارد layout نهایی می‌شود، نه صرفاً font swap. بنابراین اصلاح بعدی باید route fallback و main-height reservation را در App shell با Chrome trace layout-shift بررسی کند. افزودن min-height به footer به‌تنهایی برای حذف کامل این attribution کافی نبوده است.

## Validation

- targeted ESLint: موفق، بدون error؛
- production build: موفق؛
- SEO prerender: موفق، ۱۵ route عمومی و ۳ article record؛
- cold/warm Homepage Lighthouse: اجرا شد؛
- LCP element و layout-shift attribution: استخراج و ثبت شد؛
- worker/preload isolation: در build حفظ شد.

## تصمیم بعدی

برای رسیدن به CLS نزدیک صفر، باید ابتدا `Suspense` route fallback، ارتفاع اولیهٔ `<main>` و زمان mount شدن Footer با Chrome layout-shift trace بررسی شود. تغییر typography فعلی به‌عنوان اصلاح امن و قابل نگهداری باقی می‌ماند؛ بازگرداندن CDN font توصیه نمی‌شود.
