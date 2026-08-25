# گزارش تفکیک Shared Chunk و بنچمارک تکرارشوندهٔ LCP

## تغییرات پیاده‌سازی‌شده

Toaster و Sonner از importهای eager در `App.tsx` خارج شدند و به `DeferredNotifications` منتقل شدند. این boundary با `requestIdleCallback` و fallback زمانی پس از شروع صفحه mount می‌شود و تا آن زمان هیچ UI یا layout جدیدی اضافه نمی‌کند.

`AmbientPaperParticles` نیز از مسیر initial Homepage حذف شد و در `DeferredAmbientParticles` پشت idle callback و dynamic import قرار گرفت. در reduced-motion یا نبود قابلیت idle، مسیر fallback بدون particle و بدون وابستگی به canvas همچنان معتبر است.

Homepage دیگر از creative barrel گسترده برای Hero استفاده نمی‌کند و componentهای critical را مستقیم import می‌کند. این کار تحلیل graph را دقیق‌تر و مرزهای route را قابل کنترل‌تر می‌کند.

Vite نیز dependencyهای Markdown، PDF، LiveKit و E2EE را از modulepreload عمومی فیلتر می‌کند و vendor chunkهای آن‌ها را برای routeهای مصرف‌کننده حفظ می‌نماید.

## Build evidence

در build نهایی:

| Asset | Raw |
|---|---:|
| Homepage entry | 110.3 KB |
| React vendor | 178.6 KB |
| Radix vendor | 138.6 KB |
| Application shared chunk | 675.6 KB |
| LiveKit vendor | 665.6 KB |
| Markdown vendor | 371.4 KB |
| PDF vendor | 365.3 KB |
| PDF worker | 1.33 MB |

با وجود باقی‌ماندن shared application chunk بزرگ، modulepreload Homepage فقط React، Radix، Query و icons را شامل می‌شود. Markdown/PDF/LiveKit در preload اولیه نیستند.

## Lighthouse methodology

بنچمارک روی production preview با profile زیر اجرا شد: RTT برابر 150ms، throughput برابر 1600Kbps، CPU slowdown برابر 4x و mobile emulation. سه cold run با browser profile کاملاً جدید اجرا شدند. برای هر warm run ابتدا همان profile یک بار primed شد و سپس audit دوم با `--disable-storage-reset` اندازه‌گیری شد.

## Results

| Cache | Run 1 LCP | Run 2 LCP | Run 3 LCP | Median LCP | Median CLS | Median TBT | Median Transfer | Median Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Cold | 5,411ms | 5,411ms | 5,410ms | **5,411ms** | 0.028 | 164ms | 829,678 B | 0.74 |
| Warm | 5,413ms | 5,410ms | 5,410ms | **5,410ms** | 0.028 | 161ms | 829,678 B | 0.74 |

LCP element در هر شش اجرا ثابت بود:

```text
div.container > div.max-w-2xl > p.kb-masked-reveal > span.kb-masked-reveal__content
```

## مقایسه با baseline

Baseline پیشین با build/preview قبلی حدود 28.8 ثانیه LCP cold، 4.8MiB transfer و score حدود 0.45 داشت. در build فعلی LCP median حدود 5.41 ثانیه و transfer حدود 0.83MB است. این معادل حدود 81٪ کاهش LCP cold و حدود 83٪ کاهش transfer نسبت به baseline ثبت‌شده است. با این حال، چون baselineهای پیشین با server/build graph متفاوت گرفته شده‌اند، این مقایسه باید به‌عنوان directional engineering evidence تلقی شود، نه نتیجهٔ production RUM.

Warm و cold در این اجرای simulated Lighthouse تقریباً برابر شدند؛ این نشان می‌دهد هزینهٔ اصلی فعلی در CPU/bootstrap/render path است و نه فقط cache miss. بنابراین مرحلهٔ بعد باید shared application evaluation و LCP render delay را trace کند.

## Validation و محدودیت

- `npm run build`: موفق؛
- SEO prerender: موفق؛
- targeted ESLint: بدون error؛
- سه cold و سه warm اجرا شدند؛
- warm methodology با profile primed اصلاح شد؛
- CLS median برابر 0.028 باقی ماند؛
- Lighthouse lab مقدار INP واقعی نمی‌دهد؛
- این benchmark local و simulated است و برای تصمیم production باید با CDN، field RUM و Lighthouse mobile واقعی تکرار شود.
