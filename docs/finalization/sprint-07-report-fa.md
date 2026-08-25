# گزارش جامع اسپرینت ۷ — موتور صورت‌حساب، چرخهٔ اشتراک‌ها، درگاه زرین‌پال، سهمیه‌بندی منابع و دورنمای اسپرینت‌های آینده

**تاریخ اجرا:** ۲۴ اوت ۲۰۲۶ (۳ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI  

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

در اسپرینت ۷، موتور صورت‌حساب و مالی (Billing & Invoicing)، یکپارچه‌سازی تراکنش‌های درگاه زرین‌پال با کلیدهای یکتایی (Idempotency Keys)، چرخهٔ حیات و تمدید اشتراک‌ها (Subscription Lifecycle)، درگاه پایش مصرف (Usage Gateway) و رزرو/آزادسازی سهمیه‌های مصرفی (Quota Entitlements) به طور کامل تثبیت، ایمن‌سازی و آزموده شدند.

### اهم اقدامات انجام‌شده:
1. **موتور صدور فاکتور و پرداخت با کلیدهای یکتایی (`backend/src/modules/billing/repository.ts`):**
   - ایجاد ساختارمند فاکتورها با شمارهٔ استاندارد پیشوندی (`KB-YYYYMMDDHHMMSS-...`).
   - کنترل مبالغ خرد، اعتبارسنجی واحد پولی، اقلام فاکتور و تطابق ریاضی (`total = subtotal - discount`).
   - صدور تلاش‌های پرداخت (`payment_attempts`) با کلید یکتایی (`idempotencyKey`) جهت جلوگیری از کسر هزینهٔ تکراری یا تراکنش‌های همزمان.

2. **یکپارچه‌سازی و اعتبارسنجی درگاه زرین‌پال (`backend/src/modules/billing/zarinpal.ts`):**
   - اتصال به API نسخهٔ v4 زرین‌پال با پشتیبانی از حالت‌های Sandbox و Production.
   - تفکیک کدهای وضعیت بازگشتی: کد ۱۰۰ (پرداخت موفق)، کد ۱۰۱ (تراکنش قبلاً تأییدشده)، و کدهای منفی خطای درگاه.
   - پردازش بازگشت امن از درگاه (`/api/v1/billing/callback/zarinpal`) و نهایی‌سازی اتمیک اشتراک و فاکتور در تراکنش پایگاه‌داده.

3. **مدیریت چرخهٔ حیات اشتراک‌ها (`subscription-service.ts` و `jobs/subscription-lifecycle.ts`):**
   - تعیین بازه‌های تمدید اشتراک (`monthly`, `quarterly`, `yearly`).
   - لغو اشتراک در دو حالت: لغو آنی (`immediate: true`) با سلب دسترسی یا لغو در پایان دوره (`cancel_at_period_end: true`).
   - ورود به دورهٔ مهلت تعلیق (`grace period`) و انقضای خودکار اشتراک‌های موعد گذشته.

4. **درگاه سنجش و پایش مصرف و رزرو سهمیه (`usage/gateway.ts` و `quota/service.ts`):**
   - ثبت استاندارد رویدادهای مصرف با تفکیک توکن‌های ورودی، خروجی و کش‌شده به همراه محاسبهٔ هزینه بر حسب مبالغ خرد.
   - رزرو اتمیک سهمیه (`reserveQuota`) با قفل ردیف (`FOR UPDATE`)، تأیید پس از انجام موفق (`commitQuota`) و آزادسازی در صورت بروز خطا (`releaseQuota`).
   - اعمال خطاهای استاندارد `QuotaExceededError` (کد وضعیت ۴۲۹) و `QuotaNotConfiguredError` (کد وضعیت ۴۰۳).

5. **مایگریشن شماره ۲۳ پایگاه‌داده (`023_billing_and_quota_indexes.sql`):**
   - افزودن ایندکس‌های کارایی روی فاکتورهای سررسیدشده، اشتراک‌های در انتظار لغو، لاگ‌های مصرفی و رزروهای سهمیه.

6. **توسعهٔ آزمون‌های واحد بومی (Native Unit Tests):**
   - اضافه شدن ۳ سوئیت آزمون جدید در `tests/unit/`:
     - `tests/unit/billing-invoices.test.mjs` (تست محاسبات فاکتور، Idempotency و کدهای وضعیت زرین‌پال)
     - `tests/unit/subscription-lifecycle.test.mjs` (تست دوره‌های تمدید، سررسید و ماتریس وضعیت اشتراک)
     - `tests/unit/usage-gateway.test.mjs` (تست بهداشت متادیتای مصرف و کلاس‌های خطای سهمیه)
   - ارتقای آزمون‌های فعال سیستم به **۱۰۴ آزمون در ۴۱ سوئیت با قبولی ۱۰۰٪ (Pass: 104 / Fail: 0)** در ۲ ثانیه.

---

## ۲. جدول ماتریس وضعیت اشتراک و فاکتورها

| وضعیت اشتراک | شرح وضعیت | دسترسی به منابع | رفتار تمدید خودکار |
| :--- | :--- | :---: | :--- |
| `active` | اشتراک فعال در بازهٔ پرداخت‌شده | ✅ کامل | فعال بر اساس تنظیمات کاربر |
| `past_due` | سررسید گذشته اما در مهلت پرداخت | ✅ موقت | تلاش مجدد برای دریافت فاکتور |
| `grace` | دورهٔ مهلت چند روزه پیش از قطع دسترسی | ✅ موقت | ارسال هشدار تمدید |
| `cancelled` | لغو شده توسط کاربر (تا پایان دوره) | ✅ تا پایان دوره | عدم تمدید در پایان بازه |
| `expired` | منقضی‌شده و بدون پرداخت | ❌ مسدود | بازگشت به پلن رایگان (Free) |

---

## ۳. شواهد آزمون و اعتبارسنجی فنی

```text
TAP version 13
# tests 104
# suites 41
# pass 104
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2060ms
```

- `npm run verify:architecture`: استقلال کامل از Supabase با ۰ باقیمانده تأیید شد.
- `npm run verify:seo`: خروجی سئو تأیید شد.
- `migrate:dry-run`: ۲۳ فایل مایگریشن فعال با موفقیت اعتبارسنجی شدند (`001` تا `023`).
- `backend check & build`: با ۰ خطا کامپایل شد.
- `installer check & build`: با ۰ خطا کامپایل شد.
- `secret-scan`: ۰ فایل و کلید حساس گزارش شد.

---

## ۴. دورنما و نقشهٔ راه جامع اسپرینت‌های آینده (Sprints 8 through 15)

جهت نهایی‌سازی کامل محصول کاغذ و باد و رساندن آن به انتشار رسمی Production، مسیر پیش‌رو به شرح زیر زمان‌بندی و تفکیک شده است:

```text
اسپرینت ۷ (تکمیل شد): Billing & Quota Engine
      ↓
اسپرینت ۸: Mailbox Worker & Central Identity Hardening
      ↓
اسپرینت ۹: AI Telemetry, Title Suggestions & Academic Rewriter
      ↓
اسپرینت ۱۰: Auxiliary AI Stack (ADR-0003: n8n, OpenClaw, Open WebUI)
      ↓
اسپرینت ۱۱: Frontend Core & State Architecture Alignment
      ↓
اسپرینت ۱۲: Creative UI Integration & Design System (Phase 1)
      ↓
اسپرینت ۱۳: Creative UI & Real-data Page-Turn 3D Reader (Phase 2)
      ↓
اسپرینت ۱۴: Public Showcase, SEO Prerender & Legal/eNamad Pages
      ↓
اسپرینت ۱۵: Production Release Readiness, End-to-End Smoke & Deployment Gate
```

### شرح تفصیلی اسپرینت‌های ۸ تا ۱۵:

* **اسپرینت ۸ (Mailbox Worker & Central Identity):**
  - تثبیت Worker مستقل `Worker.Dockerfile` روی Liara برای Provisioning صندوق‌های ایمیل اختصاصی (`user-*@kaghazobaad.ir`).
  - پردازش صف Outbox و مدیریت خطاهای شبکه‌ای Liara Mail API.
  - همگام‌سازی روش‌های تماس و هویت‌های لاگین در جدول‌های `user_contact_methods` و `user_login_identities`.

* **اسپرینت ۹ (AI Telemetry, Title Suggestions & Rewriter):**
  - تثبیت اتصال امن سرور به AI Gateway با مدل‌های Gemini/OpenAI-compatible.
  - کش هوشمند پاسخ‌های AI (`ai_response_cache`) و صرفه‌جویی در هزینه‌های توکن.
  - مدیریت قطع‌کنندهٔ مدار (Circuit Breaker) برای سرویس‌های هوش مصنوعی.

* **اسپرینت ۱۰ (Auxiliary AI Stack — ADR-0003):**
  - آماده‌سازی مانیفست‌های کانتینری ابزارهای کمکی خودکارسازی و AI (مانند n8n و Open WebUI).
  - حفظ مرز مطلق استقلال سیستم مبنا و ایزولاسیون کامل هستهٔ محصول از ابزارهای آزمایشی.

* **اسپرینت ۱۱ (Frontend Core & State Alignment):**
  - اتصال کامل صفحات فرانت‌اند به کلاینت Fastify API و حذف هرگونه کد مرده.
  - هماهنگ‌سازی مدیریت وضعیت با TanStack Query، Contextهای Auth/Language و هندلینگ خطاهای شبکه.

* **اسپرینت ۱۲ (Creative UI Integration — Phase 1):**
  - پورت کردن سیستم طراحی مدرن الهام‌گرفته از MengTo (متغیرهای CSS مدرن، تم تاریک/روشن، افکت‌های Glassmorphism).
  - پیاده‌سازی تایپوگرافی دوزبانهٔ آکادمیک و کامپوننت‌های تعاملی جدید.

* **اسپرینت ۱۳ (Creative UI & Real-data Page-Turn Reader — Phase 2):**
  - فعال‌سازی کتابخوان سه‌بعدی با قابلیت ورق‌زدن واقعی صفحات مقالات و متصل به داده‌های زنده.
  - اسلایدهای تعاملی ارائه‌ها، کنترل تمام‌صفحه و تجربهٔ مطالعهٔ پیشرفته.

* **اسپرینت ۱۴ (Public Showcase, SEO & Legal/eNamad Pages):**
  - پیش‌رندر کامل صفحات عمومی، به‌روزرسانی متاتگ‌های OpenGraph و Schema.org.
  - تثبیت صفحهٔ تماس با ما، اینماد (eNamad)، قوانین و مقررات و سیاست‌های حریم خصوصی.

* **اسپرینت ۱۵ (Production Release Readiness & Release Gate):**
  - اجرای تست‌های یکپارچگی نهایی و سناریوهای بارگذاری k6.
  - ایجاد Pull Request نهایی از `integration/product-finalization` به `main` و فعال‌سازی دیپلوی خودکار Production روی سرورهای Liara.
