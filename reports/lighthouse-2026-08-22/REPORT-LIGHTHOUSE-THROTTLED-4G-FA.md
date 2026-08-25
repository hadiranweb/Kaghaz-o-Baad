# گزارش Lighthouse در شبکهٔ Throttled 4G

**تاریخ اجرا:** ۲۲ اوت ۲۰۲۶  
**محیط:** local Vite preview روی `localhost:8080`  
**پروفایل:** simulated throttling، RTT برابر 150ms، throughput برابر 1600 Kbps، CPU slowdown برابر 4، mobile screen emulation  
**دسته:** Performance

## خلاصه

بنچمارک نشان می‌دهد bottleneck فعلی عمدتاً در **critical JavaScript graph، اندازهٔ انتقالی زیاد، runtimeهای PDF/LiveKit و main-thread work** قرار دارد. در این پروفایل شبیه‌سازی‌شده، LCP هر سه route بسیار ضعیف است و بین 25 تا 29 ثانیه قرار دارد. CLS در Reader مناسب‌تر از Homepage است، اما Homepage هنوز دو layout shift و CLS حدود 0.123 دارد.

این benchmark روی local preview اجرا شده است؛ بنابراین اعداد TTFB، cache، CDN، database و network واقعی production را نشان نمی‌دهند. همچنین Lighthouse در اجرای lab مقدار INP را تولید نکرد؛ مقدارهای TBT و TTI به‌عنوان proxy آزمایشگاهی ثبت شده‌اند و INP واقعی باید با field telemetry یا interaction trace جداگانه اندازه‌گیری شود.

## نتایج routeها

| Route | Performance score | LCP | CLS | INP lab | TBT | TTI | Transfer | Requests |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 0.41 | 29.3 s | 0.123 | N/A | 410 ms | 29.3 s | 4,746 KiB | 93 |
| `/read` | 0.46 | 28.2 s | 0.025 | N/A | 391 ms | 28.2 s | 4,702 KiB | 93 |
| `/read/demo` | 0.46 | 25.1 s | 0.025 | N/A | 388 ms | 26.6 s | 4,738 KiB | 98 |

## تفسیر شاخص‌ها

### LCP

LCP بین 25.1 و 29.3 ثانیه است و مهم‌ترین failure فعلی محسوب می‌شود. FCP نیز بین 13.7 و 14.1 ثانیه گزارش شده است. این اختلاف نشان می‌دهد صفحه نه‌تنها دیر به اولین paint می‌رسد، بلکه عنصر اصلی قابل مشاهده نیز دیر آماده می‌شود. علت‌های محتمل و قابل مشاهده در خروجی شامل graph بزرگ، انتقال حدود 4.7 MiB، dependencyهای غیرضروری و render-blocking resources هستند.

### INP

در گزارش lab، audit مربوط به `interaction-to-next-paint` مقدار عددی نداشت؛ بنابراین INP واقعی قابل ادعا نیست. برای این routeها، TBT حدود 388 تا 410ms و TTI حدود 26.6 تا 29.3s ثبت شده است. این اعداد نشان می‌دهند اجرای اولیهٔ JavaScript هنوز هزینه‌بر است، اما جایگزین INP field data نیستند.

### CLS

Reader و Article route با CLS حدود 0.025 وضعیت نسبتاً پایدار دارند. Homepage با CLS حدود 0.123 از این دو بدتر است و Lighthouse دو layout shift پیدا کرده است. priority بعدی Homepage باید بررسی اندازهٔ assetها، font swap، hydration/route rendering و هر revealی باشد که ارتفاع اولیهٔ محتوا را تغییر می‌دهد.

### TTFB و network

TTFB در local preview حدود 2 تا 8ms دیده شده است و bottleneck server نیست. در عوض، 93 تا 98 request و حدود 4.7MiB transfer در پروفایل محدود 4G هزینهٔ اصلی را ایجاد می‌کند. این نتیجه باید با احتیاط تفسیر شود، چون local server و cache با production یکسان نیستند.

## فرصت‌های اصلی Lighthouse

| Route | Opportunity | مقدار گزارش‌شده |
|---|---|---:|
| `/` | Minimize main-thread work | 5.8 s |
| `/` | Render-blocking resources | حدود 450 ms savings |
| `/` | Minify JavaScript | حدود 1,504 KiB savings در audit |
| `/` | Layout shifts | 2 مورد |
| `/read` | Minimize main-thread work | 2.3 s |
| `/read` | Render-blocking resources | حدود 1,210 ms savings |
| `/read` | Reduce unused JavaScript | حدود 812 KiB savings در audit |
| `/read/demo` | Minimize main-thread work | 2.3 s |
| `/read/demo` | Render-blocking resources | حدود 750 ms savings |
| `/read/demo` | Reduce unused JavaScript | حدود 741 KiB savings در audit |

## رابطه با bundle فعلی

در build فعلی، vendorهای سنگین همچنان در output وجود دارند:

| Asset | اندازهٔ خام تقریبی |
|---|---:|
| `livekit-vendor` | 665 KiB |
| `pdf-vendor` | 364 KiB |
| `react-vendor` | 179 KiB |
| `radix-vendor` | 139 KiB |
| `markdown-vendor` | 383 KiB، خارج از modulepreload Homepage |
| shared application chunk | حدود 678 KiB |

Markdown editor از modulepreload Homepage حذف شده است و import مستقیم آن فقط در `LazyMarkdownEditor` باقی مانده است. با این حال، PDF و LiveKit هنوز باید route-level و feature-level graph دقیق‌تری داشته باشند؛ این دو dependency به‌تنهایی می‌توانند در preload یا runtime routeهای نامرتبط هزینه ایجاد کنند.

## اقدام‌های پیشنهادی با اولویت

### P0 — critical path

ابتدا باید Homepage و Archive بدون route runtimeهای PDF، LiveKit و editor بارگذاری شوند. modulepreload و dynamic import باید در output نهایی route به route بررسی شود. shared application chunk نیز باید با import مستقیم، حذف barrelهای سنگین و lazy کردن feature boundaryهای باقی‌مانده کاهش یابد.

### P1 — LCP و CLS

برای Homepage باید LCP element با Lighthouse trace یا screenshot دقیق تعیین شود. assetها باید width/height قطعی، `font-display: swap`، preload محدود برای hero critical و lazy loading برای تصویرهای پایین صفحه داشته باشند. ارتفاع اولیهٔ revealها و dock نباید باعث جابه‌جایی layout شود.

### P1 — runtime

PDF worker و LiveKit/E2EE worker باید فقط بعد از ورود کاربر به route یا intent واقعی ساخته شوند. برای LiveRoom، loading state باید پیش از ساخت Room و component tree سنگین نمایش داده شود. PDF viewer نیز باید worker و document را بعد از انتخاب فایل/slide lazy کند.

### P2 — measurement

INP باید با Chrome trace و interaction script برای keyboard، pointer و touch اندازه‌گیری شود. سپس Lighthouse با سه اجرای تکرارشونده، warm/cold cache و یک اجرای desktop مقایسه شود. برای production، field data مانند CrUX یا RUM لازم است.

## معیارهای پذیرش پیشنهادی

| شاخص | هدف مرحلهٔ بعد |
|---|---:|
| Homepage LCP در throttled mobile | کمتر از 4s به‌عنوان هدف داخلی اولیه |
| Homepage CLS | کمتر از 0.1 |
| TBT | کمتر از 200ms در routeهای public |
| public route modulepreload | بدون PDF، LiveKit و editor |
| public route transfer | کاهش محسوس نسبت به 4.7 MiB baseline |
| INP | اندازه‌گیری با trace/field؛ ادعای lab بدون داده ممنوع |

این اهداف، budget داخلی برای توسعه هستند و جایگزین Core Web Vitals production نیستند.

## فایل‌های خام

- `home.json`
- `read.json`
- `article.json`

این فایل‌ها باید برای مقایسهٔ before/after نگه‌داری شوند. اجرای بعدی باید همان route، همان profile، همان viewport و حداقل سه repetition داشته باشد.

## نتیجهٔ نهایی

lazy کردن Markdown موفق شده editor را از public consumerها و modulepreload Homepage خارج کند، اما bottleneck اصلی Lighthouse هنوز حل نشده است. اقدام بعدی باید از PDF/LiveKit route isolation، trace shared chunk، اصلاح Homepage layout shift و اجرای interaction trace برای INP شروع شود؛ افزودن runtime سنگین یا افزایش warning limit در این مرحله راهکار قابل قبول نیست.
