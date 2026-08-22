# گزارش App Shell و تثبیت CLS

## علت‌یابی

Chrome layout-shift trace روی Homepage چهار shift و مجموع CLS برابر `0.0397` در trace مستقیم ثبت کرد. Footer در انتهای trace در y=2286 و height=88 قرار داشت و main از y=65 تا y=2286 امتداد داشت. این نتیجه نشان داد که attribution بزرگ قبلی Lighthouse عمدتاً از lifecycle و جابه‌جایی shell هنگام mount شدن lazy route می‌آید، نه فقط از font swap.

## اصلاحات

در `App.tsx`، `<main>` اکنون حداقل ارتفاع ثابت برابر `calc(100vh - 5.5rem)` دارد. `RouteFallback` نیز همین reservation را حفظ می‌کند و با `aria-busy="true"` وضعیت loading را اعلام می‌کند. بنابراین هنگام تعویض fallback با Homepage، Footer از جایگاه اولیهٔ viewport عبور نمی‌کند.

در `Footer.tsx`، min-height ثابت `5.5rem` و marker `data-layout-stable="footer"` اضافه شده است. این lifecycle به‌صورت persistent باقی می‌ماند و route content فقط داخل main تغییر می‌کند.

فونت فارسی نیز در task قبلی self-host و preload شده بود تا cross-origin font swap از attribution حذف شود.

## Verification

| بررسی | نتیجه |
|---|---:|
| targeted ESLint | موفق، بدون error |
| production build | موفق |
| SEO prerender | ۱۵ route عمومی و ۳ article record |
| Chrome layout-shift trace | CLS `0.0397`، چهار shift |
| Lighthouse Homepage cold | CLS `0.028` |
| Lighthouse Homepage cold | LCP `28.8s`، TBT `310ms` |
| Lighthouse Homepage performance | `0.49` |

CLS از baseline `0.123` به `0.028` در Lighthouse cold کاهش یافت؛ یعنی حدود 77٪ کاهش. در Chrome trace مستقیم نیز مقدار `0.0397` ثبت شد. صفر مطلق به‌دلیل تفاوت traceهای lab، font/remote Latin requests و timing runtime هنوز ادعاشدنی نیست، اما attribution اصلی footer حذف و به زیر budget داخلی `0.1` رسیده است.

LCP همچنان bottleneck مستقل است و با CLS یکی نیست؛ علت آن همچنان application bootstrap/shared JavaScript و render delay باقی‌مانده است.

## فایل‌های evidence

- `reports/layout-shift-trace-home.json`
- `reports/lighthouse-2026-08-22/home-app-final-cold.json`
- `scripts/trace-layout-shifts.mjs`

## تصمیم بعدی

برای صفر نزدیک‌تر، باید چهار shift با timestamp و selector از trace به componentهای دقیق نگاشت شوند و سپس Latin font loading، particle canvas و reveal surfaceها جداگانه بررسی شوند. تغییرات فعلی بدون حذف محتوا و بدون پنهان کردن warningها، shell height را پایدار کرده‌اند.
