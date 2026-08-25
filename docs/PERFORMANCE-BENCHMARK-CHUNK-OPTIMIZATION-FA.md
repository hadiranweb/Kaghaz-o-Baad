# گزارش بنچمارک لود و بهینه‌سازی Chunkها

## دامنهٔ اندازه‌گیری

اندازه‌گیری روی build production فعلی Vite و سرور local preview انجام شد. اعداد HTTP با `curl` در یک محیط sandbox و بدون شبیه‌سازی شبکهٔ موبایل ثبت شده‌اند؛ بنابراین برای مقایسهٔ regression و روند داخلی معتبرند، اما جایگزین Lighthouse یا RUM روی دستگاه واقعی نیستند.

## نتیجهٔ تغییرات

پیش از تغییر vendor policy، بزرگ‌ترین application chunk برابر **943,914 bytes** بود. پس از تفکیک dependencyهای مشترک، بزرگ‌ترین application chunk به **675,855 bytes** رسید؛ یعنی حدود **28.4٪ کاهش در حجم خام** همان chunk. ورودی اصلی HTML اکنون `index-CA8m7tEk.js` با **111,637 bytes** است و chunk مشترک بزرگ‌تر به‌صورت جداگانه `index-D0WMGL_6.js` تولید می‌شود.

| شاخص | قبل | بعد | تغییر |
|---|---:|---:|---:|
| بزرگ‌ترین application chunk | 943,914 B | 675,855 B | 28.4٪ کاهش |
| gzip بزرگ‌ترین shared chunk بعد از تغییر | — | 239,933 B | baseline بعدی |
| gzip entry Homepage بعد از تغییر | — | 33,139 B | critical entry |
| Homepage HTTP total در localhost | — | 0.006021 s | baseline محلی |
| `/read` HTTP total در localhost | — | 0.003779 s | baseline محلی |

## سیاست chunking اعمال‌شده

در `vite.config.ts`، dependencyهای زیر route/vendor boundary جدا دارند: React و Router، Radix UI، Lucide، TanStack Query، فرم‌ها و Zod، Markdown، Recharts، date-fns، PDF.js و LiveKit. routeهای فعلی نیز lazy باقی مانده‌اند و dependencyهای سنگین PDF/LiveKit وارد entry اصلی نمی‌شوند.

## خروجی فعلی build

| Chunk | حجم خام | gzip تقریبی |
|---|---:|---:|
| `livekit-vendor` | 665,477 B | 180,530 B |
| `markdown-vendor` | 382,981 B | 117,270 B |
| `pdf-vendor` | 364,166 B | 107,430 B |
| `react-vendor` | 178,592 B | 58,600 B |
| `radix-vendor` | 138,593 B | 42,720 B |
| `index-CA8...` entry | 111,637 B | 33,139 B |
| `index-D0...` shared | 675,855 B | 239,933 B |
| `icons-vendor` | 35,291 B | 6,920 B |

`pdf.worker` و LiveKit worker در فایل‌های جدا باقی مانده‌اند. هشدار chunk بزرگ هنوز وجود دارد، اما اکنون با boundaryهای قابل تشخیص و قابل پیگیری ثبت شده است.

## تصمیم‌های بهینه‌سازی

به‌جای مخفی‌کردن هشدار با افزایش `chunkSizeWarningLimit`، dependencyها به vendorهای قابل تحلیل تقسیم شدند. این کار اندازهٔ entry اصلی را کاهش می‌دهد و مسیرهای کم‌استفاده را از نظر caching مستقل می‌کند. گام بعدی برای کاهش بیشتر chunk مشترک، trace کردن importهای مشترک Markdown/UI و lazy کردن editorهای مدیریت محتوا در سطح component است؛ این کار باید جداگانه انجام شود تا editor برای مسیر public reader تحمیل نشود.

## کیفیت و محدودیت اندازه‌گیری

`eslint` و `npm run build` موفق هستند. صفحهٔ Homepage و مسیر `/read` با browser preview بررسی شدند و navigation، fallback loading و مسیرهای واقعی مقاله حفظ شده‌اند. آرشیو در زمان بررسی دادهٔ مقاله نداشت و بنابراین geometry کارت‌ها با fixture داده‌ای باید در QA مستقل نیز بررسی شود.

هشدار غیرمسدودکنندهٔ Fast Refresh برای export hook از فایل `MotionProvider` و warning مربوط به chunk بزرگ باید در hardening بعدی پاک‌سازی یا تصمیم‌گیری شوند. برای acceptance نهایی، Lighthouse روی desktop/mobile، تست throttled 4G، اندازه‌گیری LCP/INP/CLS، و بررسی modulepreload در production domain لازم است.
