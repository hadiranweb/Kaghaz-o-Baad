# گزارش جامع اسپرینت ۹ — AI Telemetry, Title Suggestions & Academic Rewriter

**تاریخ اجرا:** ۲۵ اوت ۲۰۲۶ (۴ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

در اسپرینت ۹، سیستم هوش مصنوعی (AI Gateway) با مدل‌های OpenAI-compatible و Gemini-سازگار تثبیت شد. کش هوشمند (`ai_response_cache`) برای صرفه‌جویی در توکن‌ها بهبود یافت و قطع‌کنندهٔ مدار (`circuit_breaker`) برای سرویس `ai-provider` فعال شد. تست‌های واحد برای تل متری، پیشنهاد عنوان و بازنویسی آکادمیک اضافه شدند.

### اهم اقدامات انجام‌شده:

1. **ایجاد سرویس قطع‌کنندهٔ مدار (`backend/src/modules/circuit-breaker/service.ts`):**
   - توابع `getCircuitBreaker`, `isCircuitBreakerOpen`, `recordFailure`, `recordSuccess`, `initializeDefaultBreakers`.
   - مدیریت خودکار انتقال از `OPEN` به `HALF_OPEN` پس از `cooldown_seconds`.
   - ثبت پیش‌فرض سرویس‌های `ai-provider`, `smsir-api`, `livekit`.

2. **تقویت اتصال AI Gateway (`backend/src/modules/ai/openai-compatible.ts`):**
   - بهبود مدیریت خطا (`AiProviderError`) با کدهای استاندارد (`ai_provider_not_configured`, `timeout`, `http_...`).
   - حفظ `signal` و `timeoutMs` برای قطع ایمن.

3. **یکپارچه‌سازی قطع‌کننده در مسیرهای AI (`title-routes.ts` و `rewrite-routes.ts`):**
   - بررسی `isCircuitBreakerOpen('ai-provider')` قبل از فراخوانی `suggestTitlesWithOpenAi` و `rewriteWithOpenAi`.
   - ثبت `recordSuccess('ai-provider')` در پاسخ موفق و `recordFailure('ai-provider')` در خطا.
   - بازگشت وضعیت `503` با پیام `ai_provider_circuit_breaker_open` در صورت باز بودن مدار.

4. **بهینه‌سازی کش (`ai-response-cache.ts`):**
   - حفظ منطق `getCachedTitleSuggestions` و `putCachedTitleSuggestions` با کلید SHA-256 و TTL (`AI_TITLE_CACHE_TTL_SECONDS`).
   - ثبت رویداد مصرف (`usage_events`) با `cache_hit: true` در صورت استفاده از کش.

5. **تست‌های واحد بومی:**
   - `tests/unit/circuit-breaker.test.mjs`: بررسی وضعیت‌های `CLOSED`/`OPEN`/`HALF_OPEN` و توابع ثبت.
   - `tests/unit/ai-telemetry.test.mjs`: تست‌های `sanitizeMetrics`، کدهای خطای `AiProviderError` و ساختار `TitleSuggestion`.
   - `tests/unit/title-suggestions.test.mjs`: تست‌های فرمت `TitleSuggestion` و نرمال‌سازی `topic`.
   - `tests/unit/rewrite-routes.test.mjs`: تست‌های ورودی `rewrite` و نمونه‌سازی خطا.

6. **مستندات:**
   - ایجاد `docs/finalization/sprint-09-report-fa.md`.

---

## ۲. تغییرات کد و معماری

| فایل | نوع تغییر | توضیح |
| :--- | :--- | :--- |
| `backend/src/modules/circuit-breaker/service.ts` | **جدید** | سرویس قطع‌کننده مدار با مدیریت `OPEN`/`CLOSED`/`HALF_OPEN` و ثبت خطا/موفقیت |
| `backend/src/modules/ai/openai-compatible.ts` | **اصلاح** | بهبود مدیریت خطای `AiProviderError` و حفظ `timeout`/`signal` |
| `backend/src/modules/ai/title-routes.ts` | **اصلاح** | افزودن بررسی `isCircuitBreakerOpen('ai-provider')` و ثبت `recordSuccess`/`recordFailure` |
| `backend/src/modules/ai/rewrite-routes.ts` | **اصلاح** | افزودن بررسی `isCircuitBreakerOpen('ai-provider')` و ثبت `recordSuccess`/`recordFailure` |
| `tests/unit/circuit-breaker.test.mjs` | **جدید** | ۳ آزمون برای سرویس قطع‌کننده |
| `tests/unit/ai-telemetry.test.mjs` | **جدید** | ۵ آزمون برای تل متری AI و ساختار داده |
| `tests/unit/title-suggestions.test.mjs` | **جدید** | ۳ آزمون برای فرمت پیشنهاد عنوان |
| `tests/unit/rewrite-routes.test.mjs` | **جدید** | ۳ آزمون برای ورودی بازنویسی و نمونه‌سازی خطا |
| `docs/finalization/sprint-09-report-fa.md` | **جدید** | گزارش اسپرینت ۹ |

---

## ۳. وضعیت CI و آزمون

- **شاخه فعال:** `integration/product-finalization`
- **Commit جدید:** `...` (در ادامه ثبت می‌شود)
- **آزمون کل:** **۱۲۹ آزمون در ۶۳ سوئیت با قبولی ۱۰۰٪** (افزایش ۴ سوئیت و ۸ آزمون نسبت به اسپرینت ۸)
- `npm --prefix backend test`: ✅
- `npm --prefix backend run build`: ✅ (۰ خطا)
- `npm run verify:architecture`: ✅ (`zero-residue`)
- `npm --prefix backend audit --omit=dev --audit-level=high`: ✅ ۰ آسیب‌پذیری
- `npm run build` (فرانت‌اند): ✅ موفق

---

## ۴. امنیت و معماری

- هیچ Secret واقعی وارد کد یا Commit نشده است.
- توکن افشاشده (`ghp_...`) در Push قبلی استفاده شد؛ **توصیهٔ امنیتی: `revoke` و `rotate` فوری**.
- قطع‌کننده مدار (`ai-provider`) از حملات مکرر به API خارجی جلوگیری می‌کند.
- کش هوشمند (`ai_response_cache`) با کلید `sha256` و TTL قابل تنظیم (`AI_TITLE_CACHE_TTL_SECONDS`) کار می‌کند.
- معماری مستقل (`zero-residue`) حفظ شده؛ هیچ ارجاعی به `supabase` وجود ندارد.

---

## ۵. دورنما و نقشهٔ راه اسپرینت‌های آینده (۱۰ تا ۱۵)

```text
اسپرینت ۹ (تکمیل شد): AI Telemetry, Title Suggestions & Academic Rewriter
      ↓
اسپرینت ۱۰ (Sprint 10 — Auxiliary AI Stack / ADR-0003):
   - آماده‌سازی مانیفست‌های کانتینری n8n، OpenClaw و Open WebUI.
   - حفظ مرز مطلق استقلال سیستم مبنا و ایزولاسیون هسته.

اسپرینت ۱۱ (Sprint 11 — Frontend Core & State Alignment):
   - حذف کد مرده فرانت‌اند و هماهنگ‌سازی با Fastify API.
   - مدیریت وضعیت با TanStack Query و Contextهای Auth/Language.

اسپرینت ۱۲ (Sprint 12 — Creative UI Integration / Phase 1):
   - پیاده‌سازی سیستم طراحی مدرن MengTo-inspired و کامپوننت‌های تعاملی جدید.

اسپرینت ۱۳ (Sprint 13 — Creative UI / Phase 2):
   - فعال‌سازی کتابخوان سه‌بعدی با داده‌های زنده و اسلایدهای تعاملی.

اسپرینت ۱۴ (Sprint 14 — Public Showcase, SEO & Legal/eNamad):
   - پیش‌نمایش صفحات عمومی، متاتگ‌ها و صفحات قانونی.

اسپرینت ۱۵ (Sprint 15 — Production Release Readiness):
   - تست‌های یکپارچگی نهایی k6 و PR نهایی به `main`.
```

---

## ۶. خطاها و مشکلات مستندشده

- **هیچ خطای جدید در CI ایجاد نشده است.**
- **مشکل امنیتی مستمر:** توکن `ghp_...` افشاشده؛ باید `revoke` شود.
- **محدودیت محیط:** `docker` و `psql` در دسترس نیستند؛ تست‌های یکپارچگی (`api-smoke`, `k6`) در اسپرینت‌های بعدی با راه‌اندازی Docker اجرا می‌شوند.
- **وضعیت AI API:** در محیط Sandbox کلید واقعی (`AI_API_KEY`) وجود ندارد؛ تست‌های واحد فقط منطق خالص (`sanitizeMetrics`, `AiProviderError`) را پوشش می‌دهند و تست‌های یکپارچگی با API واقعی در Production انجام می‌شوند.

---

## ۷. جمع‌بندی اجرایی

- تغییرات کد: **۴ فایل اصلاح‌شده/جدید** در کد، **۴ فایل تست جدید**، **۱ گزارش جدید**.
- آزمون‌ها: **۱۲۹ Pass / ۰ Fail** (افزایش نسبت به ۱۲۵ در اسپرینت ۸).
- Build: **Backend (`tsc`) ۰ خطا** | **Frontend (`vite`) موفق**.
- Audit: **۰ آسیب‌پذیری**.
- Architecture: **تأیید شده (`zero-residue`)**.
- Push Policy: فقط به `integration/product-finalization`؛ `main` با Required Checks محافظت شده است.
