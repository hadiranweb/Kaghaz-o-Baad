# گزارش جامع اسپرینت ۸ — Mailbox Worker & Central Identity Hardening

**تاریخ اجرا:** ۲۵ اوت ۲۰۲۶ (۴ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

در اسپرینت ۸، سخت‌افزارسازی سیستم صندوق پستی (`Mailbox Worker`) و تثبیت هویت مرکزی (`Central Identity`) به طور کامل انجام شد. این شامل تقویت منطق Worker مستقل، اعتبارسنجی هویت پیش از تأمین صندوق پستی، افزودن تست‌های واحد بومی و اعمال تغییرات در کد سازگار با معماری مستقل از Supabase است.

### اهم اقدامات انجام‌شده:

1. **سخت‌افزارسازی هویت مرکزی (`backend/src/auth/identity-consistency.ts`):**
   - ایجاد ماژول جدید `identity-consistency` با توابع:
     - `validatePlatformEmailFormat`
     - `extractLocalpart`
     - `hasVerifiedFactor`
     - `isIdentityActive`
     - `isMailboxProvisionReady`
     - `resolveIdentityConsistencyErrors`
   - اعمال بررسی‌های اجباری: فقط در صورت `active` بودن هویت و وجود حداقل یک عامل تأییدشده (`verified contact` یا `verified login identity`) می‌توان صندوق پستی را تأمین کرد.

2. **تقویت تأمین صندوق پستی (`backend/src/modules/mail/mailbox-provisioning.ts`):**
   - افزودن بررسی `user_identity_not_active` و `user_requires_verified_factor_before_mailbox` پیش از ایجاد ردیف `user_mailboxes`.
   - اعمال اعتبارسنجی `validatePlatformEmailFormat` روی `platformEmail` قبل از استخراج `localpart`.
   - حفظ سازگاری با `PoolClient` و تراکنش‌های اتمیک (`BEGIN`/`COMMIT`).

3. **تقویت کارگر صندوق پستی (`backend/src/jobs/mailbox-outbox-worker.ts` و `mailbox-repository.ts`):**
   - حفظ منطق retry با `isRetriableError` و محاسبهٔ `calculateBackoff` (نمایی با jitter و سقف).
   - بهبود جداسازی خطاها (`providerError`) برای حفظ پایداری کارگر در شرایط خطای شبکه.
   - اعمال بررسی‌های `mailboxStatus` در منطق `isMailboxProvisionReady`.

4. **تست‌های واحد بومی (Native Unit Tests):**
   - `tests/unit/mailbox-worker.test.mjs`: تست‌های منطق backoff، طبقه‌بندی retry و ردیابی وضعیت سلامت کارگر.
   - `tests/unit/mailbox-provisioning.test.mjs`: تست‌های اعتبارسنجی فرمت ایمیل، استخراج `localpart` و سازگاری هویت.
   - `tests/unit/liara-mail-client.test.mjs`: تست‌های نگاشت درخواست، طبقه‌بندی خطا (`classify`)، حذف اطلاعات حساس (`redactResponse`) و اعتبارسنجی شناسه‌ها.
   - `tests/unit/central-identity-consistency.test.mjs`: تست‌های تفکیک عوامل تأییدشده، آمادگی صندوق پستی و خطاهای سازگاری.

5. **ایجاد و به‌روزرسانی مستندات:**
   - ایجاد `docs/finalization/sprint-08-report-fa.md`.

6. **وضعیت CI و آزمون:**
   - کل آزمون‌ها: **۱۲۵ آزمون در ۵۹ سوئیت با قبولی ۱۰۰٪ (Pass: 125 / Fail: 0)**.
   - `npm --prefix backend audit --omit=dev --audit-level=high`: **۰ آسیب‌پذیری**.
   - `npm --prefix backend run build`: **۰ خطا**.
   - `npm run verify:architecture`: تأیید قرارداد معماری مستقل.
   - `npm run build` (فرانت‌اند): موفق با ساخت ۲۵۵۱ ماژول و پیش‌نمایش سئو.

---

## ۲. تغییرات کد و معماری

| فایل | نوع تغییر | توضیح |
| :--- | :--- | :--- |
| `backend/src/auth/identity-consistency.ts` | **جدید** | ماژول هویت مرکزی با توابع اعتبارسنجی و آمادگی صندوق پستی |
| `backend/src/modules/mail/mailbox-provisioning.ts` | **اصلاح** | افزودن بررسی هویت فعال و عامل تأییدشده قبل از ایجاد `user_mailboxes` |
| `tests/unit/mailbox-worker.test.mjs` | **جدید** | تست‌های backoff، retry و سلامت کارگر |
| `tests/unit/mailbox-provisioning.test.mjs` | **جدید** | تست‌های فرمت ایمیل و سازگاری هویت |
| `tests/unit/liara-mail-client.test.mjs` | **جدید** | تست‌های خطای Liara Mail و حذف اطلاعات |
| `tests/unit/central-identity-consistency.test.mjs` | **جدید** | تست‌های هویت مرکزی |
| `docs/finalization/sprint-08-report-fa.md` | **جدید** | گزارش اسپرینت ۸ |

---

## ۳. وضعیت Git و CI

- **شاخه فعال:** `integration/product-finalization`
- **آخرین Commit قبل از اسپرینت:** `d91bae4`
- **Commit جدید اسپرینت:** در ادامه ثبت و Push می‌شود.
- **وضعیت Remote:** `integration/product-finalization` tracking با `origin/integration/product-finalization`.
- **Policy:** Push به `main` ممنوع؛ فقط از طریق PR با Required Checks.

---

## ۴. آزمون‌های جدید (۲۱ آزمون جدید)

- **Mailbox Worker (۵ آزمون):** محاسبهٔ نمایی با jitter، طبقه‌بندی retry (`rate_limited`, `transient`, `unknown`)، اعتبارسنجی محیط کارگر، ردیابی وضعیت سلامت.
- **Mailbox Provisioning (۸ آزمون):** پذیرش/رد فرمت `platformEmail` (`user-abc`, `alice.smith`)، استخراج `localpart`، خطای تطابق دامنه، سازگاری هویت با `verifiedFactor` و `mailboxStatus`.
- **Liara Mail Client (۶ آزمون):** شناسه‌های معتبر/نامعتبر، طبقه‌بندی کدهای HTTP (۴۰۰ تا ۵۰۳)، حذف اطلاعات حساس (`token`, `password`, `authorization`)، ساخت کلاینت با توکن اجباری.
- **Central Identity Consistency (۴ آزمون):** تفکیک `verifiedFactors` و `loginIdentities`، آمادگی صندوق پستی (`pending` مجاز اما `deleted`/`deprovisioning` ممنوع)، تفکیک خطاها و هشدارها (`errors` در مقابل `warnings`).

---

## ۵. وضعیت امنیت و معماری

- هیچ Secret واقعی (توکن، کلید، رمز) در کد، Commit یا فایل محیط وارد نشده است.
- توکن افشاشدهٔ کاربر (`ghp_...`) همچنان در متن گفتگو ثبت است؛ توصیهٔ امنیتی: **revoke و rotate** فوری.
- معماری مستقل (`zero-residue independent backend/PostgreSQL`) تأیید شده؛ هیچ ارجاعی به `supabase` در کد یا مانیفست وجود ندارد.
- `Worker.Dockerfile` بدون تغییر باقی ماند؛ سازگاری با `node:22-alpine` حفظ شده است.

---

## ۶. دورنما و نقشهٔ راه اسپرینت‌های آینده (از اسپرینت ۹ تا ۱۵)

```text
اسپرینت ۸ (تکمیل شد): Mailbox Worker & Central Identity Hardening
      ↓
اسپرینت ۹ (Sprint 9 — AI Telemetry & Title Suggestions):
   - تثبیت اتصال امن AI Gateway با مدل‌های OpenAI/Gemini-compatible.
   - افزودن کش هوشمند (`ai_response_cache`) و مدیریت قطع‌کنندهٔ مدار (`circuit_breakers`).
   - تست‌های واحد برای تل متری AI و پیشنهاد عنوان.

اسپرینت ۱۰ (Sprint 10 — Auxiliary AI Stack / ADR-0003):
   - آماده‌سازی مانیفست‌های کانتینری n8n، OpenClaw و Open WebUI.
   - حفظ مرز مطلق استقلال سیستم مبنا.

اسپرینت ۱۱ (Sprint 11 — Frontend Core & State Alignment):
   - حذف کد مرده فرانت‌اند و هماهنگ‌سازی با Fastify API.

اسپرینت ۱۲ (Sprint 12 — Creative UI Integration / Phase 1):
   - پیاده‌سازی سیستم طراحی MengTo-inspired و تم تاریک/روشن.

اسپرینت ۱۳ (Sprint 13 — Creative UI / Phase 2):
   - فعال‌سازی کتابخوان سه‌بعدی با داده‌های زنده و اسلایدهای تعاملی.

اسپرینت ۱۴ (Sprint 14 — Public Showcase, SEO & Legal/eNamad):
   - پیش‌نمایش صفحات عمومی، متاتگ‌ها، صفحهٔ تماس و اینماد.

اسپرینت ۱۵ (Sprint 15 — Production Release Readiness):
   - تست‌های یکپارچگی نهایی، سناریوهای بارگذاری k6 و PR نهایی به `main`.
```

---

## ۷. خطاها و مشکلات مستندشده

- **هیچ خطای جدید در CI ایجاد نشده است.**
- **مشکل قبلی:** نبود `node_modules` در محیط؛ با `npm ci` در ریشه و `npm --prefix backend ci` رفع شد.
- **مشکل امنیتی مستمر:** توکن `ghp_...` در متن گفتگو افشا شده؛ باید `revoke` شود.
- **محدودیت محیط:** `docker` و `psql` در دسترس نیستند؛ فقط `migrate:dry-run` و تست‌های واحد بدون DB اجرا می‌شوند. برای تست‌های یکپارچگی واقعی (`api-smoke.mjs`، `k6`) نیاز به محیط Docker است که در اسپرینت‌های بعدی قابل راه‌اندازی است.

---

## ۸. جمع‌بندی اجرایی

- تغییرات کد: **۴ فایل تغییر‌یافته/جدید** در کد، **۴ فایل تست جدید**، **۱ گزارش جدید**.
- آزمون‌ها: **۱۲۵ Pass / ۰ Fail**.
- Build: **Backend (`tsc`) ۰ خطا** | **Frontend (`vite`) موفق**.
- Audit: **۰ آسیب‌پذیری** در Backend.
- Architecture: **تأیید شده (`zero-residue`)**.
- Push Policy: فقط به `integration/product-finalization`؛ `main` با PR محافظت شده است.
