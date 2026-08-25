# وضعیت هشت حوزهٔ توسعهٔ کاغذ و باد

**به‌روزرسانی:** ۲۰۲۶-۰۸-۲۳
**مبنای کد:** `main@0a7903e`
**قاعده:** وجود کد یا Build موفق با آمادگی عملیاتی برابر نیست.

## واژگان وضعیت

| وضعیت | تعریف |
|---|---|
| طراحی‌شده | قرارداد یا سند وجود دارد، ولی Runtime کامل نیست. |
| پیاده‌سازی‌شده | کد و Migration وجود دارد و Build می‌شود. |
| تأییدشده | تست خودکار روی PostgreSQL و سرویس واقعی/جایگزین کنترل‌شده پاس شده است. |
| عملیاتی | در Staging یا Production Deploy، مانیتور و با Runbook تأیید شده است. |

## نتیجهٔ ممیزی

Repository از Roadmap قدیمی جلوتر رفته است. Workflow، Usage، Quota، LiveKit، Billing و Deployment دیگر صرفاً Foundation نیستند؛ برای آن‌ها Runtime وجود دارد. خلأ اصلی اکنون **تست، یکدست‌سازی قراردادها، Staging، امنیت، Observability و Rollback** است.

هیچ مرحله‌ای فقط بر اساس وجود فایل «تمام‌شده» اعلام نمی‌شود.

| حوزه | وضعیت کد | وضعیت عملیاتی | Gate باقیمانده |
|---|---|---|---|
| ۱. Backend، Auth، RBAC، Workflow و Comment | پیاده‌سازی‌شده | تأییدنشده | تست Integration و منفی RBAC، یکدست‌سازی Roleها، Staging DB |
| ۲. Usage Gateway و Attribution | پیاده‌سازی‌شده | تأییدنشده | تست success/error/timeout، Pricing snapshot و Audit |
| ۳. Quota و Entitlement | پیاده‌سازی‌شده | تأییدنشده | تست هم‌زمانی، idempotency و rollback مصرف |
| ۴. مدیریت Plan و گزارش | بخشی پیاده‌سازی‌شده | تأییدنشده | API مدیریت کامل Plan، Audit و تست مجوز |
| ۵. AI Provider و Automation | Provider پایه پیاده‌سازی‌شده | تأییدنشده | Feature Flag، Cost guard، Human approval و AI Stack مستقل |
| ۶. LiveKit | Route، Token، Webhook، Recording و UI پیاده‌سازی‌شده | تأییدنشده | تست سرویس واقعی، consent، reconnect، quota و Runbook |
| ۷. Billing و Subscription | Zarinpal adapter و lifecycle پیاده‌سازی‌شده | تأییدنشده | Sandbox E2E، callback تکراری/دستکاری‌شده، reconciliation |
| ۸. Liara و Release | Deployment خودکار `main` پیاده‌سازی‌شده | Production workflow مشاهده شده؛ Staging نامشخص | Branch Protection، Staging، backup، health verification و rollback |

## حوزهٔ ۱ — Backend و Workflow

کد موجود:

- Auth مستقل، Session، OTP، OAuth و Verification؛
- CRUD مقاله؛
- انتقال‌های `submit_for_review`، `request_changes`، `approve`، `schedule`، `publish`، `archive` و `restore_draft`؛
- Row lock و Transaction برای تغییر وضعیت؛
- `article_workflow_events` و `activity_events`؛
- Comment routes؛
- Admin routes.

ریسک مهم: نام Roleها میان Migration اولیه، Routeهای Admin و Roleهای مدیریتی جدید کاملاً یکدست نیست. پیش از تأیید باید ماتریس رسمی Role و Migration سازگار تثبیت شود.

**Gate:** تست API برای مالک/غیرمالک و نقش‌های author، contributor، editor، admin و نقش‌های مدیریتی؛ تست Transition نامعتبر و ثبت Event اتمیک.

## حوزهٔ ۲ — Usage Gateway

Gateway، Repository، Provider سازگار با OpenAI و Routeهای پیشنهاد عنوان/بازنویسی وجود دارند. Attribution و Request ID در کد دیده می‌شود.

**Gate:** اثبات ثبت Execution برای موفقیت، خطا، Timeout و Cache؛ تعیین نسخهٔ Pricing و جلوگیری از پذیرش هزینه از Frontend/Provider به‌عنوان منبع حقیقت.

## حوزهٔ ۳ — Quota و Entitlement

Migration و Service مربوط به Plan، Entitlement، Counter، Reservation، Commit و Release وجود دارد و به حداقل یک قابلیت AI متصل شده است.

**Gate:** تست Race روی PostgreSQL واقعی، Idempotency درخواست تکراری و آزادشدن Reservation پس از خطا.

## حوزهٔ ۴ — مدیریت Plan

UI و بخشی از مدل داده/گزارش وجود دارد، ولی API مدیریتی کامل و تست Audit هنوز اثبات نشده است.

**Gate:** تغییر Parameter فقط توسط نقش مجاز، ثبت Audit، Cache invalidation و اثر قابل مشاهده در Quota Gateway.

## حوزهٔ ۵ — AI و Automation

Provider server-side و دو قابلیت AI وجود دارند. n8n، OpenClaw و Open WebUI هنوز در خط Production `main` نیستند و باید سرویس‌های کمکی مستقل باشند.

**Gate:** Feature Flag و Kill Switch، Redaction، Budget، Timeout، Circuit Breaker، Human approval و عدم دسترسی مستقیم Agent به Production DB.

## حوزهٔ ۶ — LiveKit

Backend فعلی Token، Webhook، Role، Participant management، Interaction و Recording را پوشش می‌دهد. Frontend نیز Room، E2EE اختیاری، Presentation و Reconnect را دارد.

**Gate:** تست Staging با LiveKit واقعی، امضای Webhook، نقش‌ها، E2EE، Consent ضبط، Reconnect و پایان جلسه.

## حوزهٔ ۷ — Billing

Invoice، Payment attempt، Callback زرین‌پال، Subscription و Lifecycle job وجود دارند.

**Gate:** Sandbox E2E، Server-to-server verification، Idempotency callback، Expiration، Reconciliation و Audit مالی.

## حوزهٔ ۸ — Liara و Release

Workflow فعلی پس از Push موفق به `main`، Backend، Mailbox Worker و Frontend را روی Liara Deploy می‌کند. این رفتار خودکار است و توضیح قدیمیِ «غیرخودکار» نادرست بود.

**Gate:**

- Pull Request و Required Checks برای `main`؛
- Environment مستقل Production؛
- محیط Staging؛
- Migration واقعی روی DB موقت/Staging؛
- Health verification پس از Deploy؛
- Backup/Restore drill؛
- Rollback مستند.

## مسیر اجرایی فعلی

Roadmap قبلی ساخت قابلیت را مرحلهٔ اصلی می‌دانست. خط فعلی نهایی‌سازی بر Hardening متمرکز است:

```text
Baseline و قرارداد معماری
  → Backend/Auth/Mail Worker
  → حذف Legacy Supabase
  → Storage/LiveKit
  → Usage/Quota/Billing
  → AI Stack اختیاری
  → UI جامع
  → CI/CD و Observability
  → Staging/UAT
  → Production
```

برنامهٔ تفصیلی در `docs/finalization/roadmap-fa.md` و گزارش هر اسپرینت در `docs/finalization/` نگهداری می‌شود.

## تصمیم رسمی فعلی

وضعیت محصول:

```text
Production Hardening — In Progress
```

قابلیت‌های اصلی در سطح کد گسترده‌اند، اما Release نهایی تا عبور از Test، Security، Staging، Observability و Rollback Gateها اعلام نمی‌شود.
