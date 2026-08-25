# برنامهٔ اجرای Worker Isolation، LCP/CLS Hardening و INP Benchmark

## هدف

خارج‌کردن PDF worker و LiveKit/E2EE از critical path مسیرهای عمومی، کاهش layout shift در Homepage و تعیین element واقعی LCP، سپس ساخت interaction trace برای برآورد INP و اجرای Lighthouse با cache سرد و گرم در همان profile Throttled 4G.

## فازهای اجرا

### ۱. Trace و baseline

import graph فعلی برای `pdfjs-dist`، `PdfWorker`، `livekit-client`، `@livekit/components-react` و E2EE worker ثبت می‌شود. خروجی build، modulepreload و assetهای worker قبل از تغییر نگه‌داری می‌شوند.

### ۲. Worker isolation

importهای PDF و LiveKit از shared/public boundary خارج می‌شوند. PDF worker فقط داخل consumer مربوط به viewer و پس از intent/وجود سند ساخته می‌شود. LiveKit Room، E2EE worker و componentهای LiveKit فقط در route یا session فعال LiveRoom بارگذاری می‌شوند. fallback loading و error برای هر دو boundary حفظ می‌شود و public Homepage/Archive/Reader نباید این workerها را preload کند.

### ۳. LCP و CLS Homepage

با Lighthouse JSON و trace، `largest-contentful-paint-element` دقیق استخراج و به selector/component مربوط نگاشت می‌شود. برای عنصر LCP، ابعاد ثابت، preload محدود در صورت نیاز، `font-display: swap` و ترتیب paint مناسب بررسی می‌شود. تصویرها و revealها باید فضای خود را از ابتدا رزرو کنند؛ هیچ animation نباید height اولیه را تغییر دهد. CSS و DOM برای جلوگیری از layout shift اصلاح می‌شود.

### ۴. Interaction trace

اسکریپت trace با Chromium DevTools Protocol یا Lighthouse user-flow ساخته می‌شود و تعامل‌های keyboard، pointer و touch روی Homepage، Archive و Reader را ثبت می‌کند. چون INP در lab عادی Lighthouse مقدار ندارد، این trace زمان input-to-next-paint یا نزدیک‌ترین event timing قابل استخراج را ثبت می‌کند و در گزارش با عنوان lab estimate، نه field INP، ارائه می‌شود.

### ۵. Cold/warm cache benchmark

برای هر route حداقل دو اجرای جدا انجام می‌شود: cold cache با context/profile جدید و warm cache با همان browser context پس از اجرای اول. profile شبکه، CPU، viewport و route ثابت می‌مانند. LCP، FCP، CLS، TBT، TTI، TTFB، transfer، requests، modulepreload و score استخراج می‌شوند.

### ۶. Validation و rollback

unit tests، targeted lint، build، SEO prerender و مقایسهٔ assetها اجرا می‌شوند. اگر worker isolation باعث regression route شود، rollback با بازگرداندن consumer boundary ممکن است؛ تغییر backend مجاز نیست.

## معیار پذیرش

- Homepage/Archive/Reader هیچ PDF یا LiveKit worker را در initial preload نداشته باشند؛
- LiveKit فقط پس از فعال‌شدن LiveRoom/session و PDF فقط پس از وجود سند/intent بارگذاری شود؛
- LCP element با selector و component مشخص در report ثبت شود؛
- Homepage CLS از baseline 0.123 کاهش یابد یا علت باقی‌ماندن آن مستند شود؛
- cold و warm benchmark هر سه route با raw JSON ذخیره شوند؛
- INP lab estimate با trace و محدودیت آن شفاف ثبت شود؛
- lint، test، build و prerender موفق باشند.

## خروجی

گزارش Markdown فارسی، raw Lighthouse JSON برای cold/warm، trace summary، asset/preload comparison، فایل‌های isolation و commit قابل rollback در branch `feat/comprehensive-mengto-skills-ui`.
