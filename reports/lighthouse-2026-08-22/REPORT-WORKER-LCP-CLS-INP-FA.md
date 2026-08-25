# گزارش Worker Isolation، LCP/CLS و Interaction Trace

## خروجی اجرایی

PDF و LiveKit از critical public path جدا شدند. در `LiveRoom`، PDF.js و PDF worker فقط داخل `PdfViewer` و پس از وجود URL سند به‌صورت dynamic import بارگذاری می‌شوند. E2EE worker نیز فقط هنگام فعال بودن encryption، وجود session و وجود passphrase dynamic import و ساخته می‌شود. مسیرهای عمومی Homepage، Archive و Reader در `dist/index.html` هیچ PDF/LiveKit worker یا vendor را در modulepreload ندارند.

Homepage نیز با `kb-lcp-critical`، disabled reveal برای عنصر critical و reservation برای `kb-hero-art` و footer harden شد. audit دقیق Lighthouse نشان داد LCP واقعی نه `h1`، بلکه span متن توضیحی داخل `MaskedReveal` است:

```text
selector: div.container > div.max-w-2xl > p.kb-masked-reveal > span.kb-masked-reveal__content
```

در cold audit، bounding box این عنصر 380×108px بود. با این حال، Lighthouse همچنان render delay بسیار بالا را گزارش می‌کند؛ این نشان می‌دهد bottleneck عمیق‌تر از صرفاً observer reveal است و باید در app bootstrap، initial JS graph و runtime rendering پیگیری شود.

## Cold/Warm Lighthouse — Throttled 4G

Profile ثابت بود: RTT برابر 150ms، throughput برابر 1600 Kbps، CPU slowdown برابر 4 و mobile emulation.

| Route | Cache | Score | LCP | CLS | TBT | Transfer | Requests |
|---|---|---:|---:|---:|---:|---:|---:|
| `/` | cold | 0.39 | 29.1s | 0.123 | 463ms | 4,746 KiB | 93 |
| `/` | warm | 0.85 | 2.7s | 0.123 | 318ms | 8 KiB | 93 |
| `/read` | cold | 0.46 | 28.1s | 0.025 | 383ms | 4,703 KiB | 93 |
| `/read` | warm | 0.90 | 2.6s | 0.025 | 287ms | 8 KiB | 93 |
| `/read/demo` | cold | 0.46 | 25.1s | 0.025 | 384ms | 4,738 KiB | 98 |
| `/read/demo` | warm | 0.90 | 2.5s | 0.025 | 293ms | 9 KiB | 99 |

Lighthouse lab در این اجرا INP عددی ارائه نکرد. بنابراین INP واقعی گزارش نمی‌شود و TBT فقط proxy اجرای اولیه است.

## Interaction trace

اسکریپت `scripts/trace-interactions.mjs` با Chromium/Puppeteer و همان شبکه/CPU profile اجرا شد. این trace برای input event، LCP، CLS و long task طراحی شده است و `inpEstimateMs` را به‌عنوان بیشینهٔ duration eventهای قابل مشاهده ثبت می‌کند؛ این مقدار **INP واقعی یا field INP نیست**.

| Route | LCP trace | CLS trace | Lab input estimate | Long tasks | Events |
|---|---:|---:|---:|---:|---:|
| `/` baseline | 23,976ms | 0.117 | 88ms | 4 | 7 |
| `/read` baseline | 22,764ms | 0.022 | 24ms | 2 | 4 |
| `/read/demo` baseline | 21,332ms | 0.019 | 40ms | 2 | 4 |
| `/` after final hardening trace | 23,152ms | 0.194 | 56ms | 5 | 7 |

افزایش CLS در trace نهایی نشان می‌دهد reservation فعلی footer به‌تنهایی کافی نیست و باید با traceهای چندتکراری و attribution دقیق‌تر بررسی شود. این نتیجه به‌عنوان regression قطعی production تلقی نمی‌شود، اما gate باز است و merge نهایی نباید بدون بررسی آن انجام شود.

## Findings

۱. Worker isolation از نظر graph خروجی موفق است: `dist/index.html` فقط React، Radix، icons و query را preload می‌کند و PDF/LiveKit/editor در initial preload نیستند.

۲. warm cache از نظر LCP به حدود 2.5 تا 2.7 ثانیه و score به 0.82 تا 0.90 می‌رسد، اما cold cache هنوز به علت حدود 4.7MiB transfer و application bootstrap سنگین، LCP حدود 25 تا 29 ثانیه دارد.

۳. LCP element دقیقاً شناسایی شد، اما disabled کردن reveal به‌تنهایی render delay را رفع نکرد. قدم بعدی باید trace bootstrap، script evaluation و source of the 98% render delay باشد.

۴. CLS Reader پایین و پایدارتر از Homepage است. Homepage هنوز نیازمند بررسی font loading، footer reflow، layout reservation و ترتیب mount componentها است.

۵. interaction trace نشان می‌دهد input eventهای lab در بازهٔ 24 تا 88ms هستند، اما این اعداد فقط تخمین event duration هستند و برای ادعای INP کافی نیستند.

## Validation

- `npm run build`: موفق؛
- SEO prerender: موفق، ۱۵ route عمومی و ۳ article record؛
- targeted ESLint: بدون error؛ دو warning قدیمی dependency در LiveRoom باقی است؛
- cold/warm Lighthouse برای هر سه route اجرا و JSON خام ذخیره شد؛
- interaction trace برای هر سه route اجرا و JSON خام ذخیره شد؛
- preload و worker edge بعد از build بررسی شد.

## اقدامات بعدی با اولویت

- trace کردن application bootstrap و script evaluation برای shared chunk حدود 678KiB؛
- بررسی اینکه چرا warm cache request count تقریباً ثابت می‌ماند اما transfer به 8–9KiB می‌رسد؛
- اجرای سه repetition برای Homepage با cold cache و استخراج median؛
- رفع attribution مربوط به footer/font و افزودن font metric override یا fallback geometry مناسب؛
- افزودن Chrome trace واقعی برای input-to-next-paint و field RUM پیش از تصمیم‌گیری دربارهٔ INP؛
- isolate کردن PDF worker و LiveKit vendor در route chunkهای واقعی و بررسی preload هر route، نه فقط Homepage.
