# کاغذ و باد | KaghazBaad

پلتفرم دوزبانهٔ فارسی/انگلیسی برای نگارش، داوری و انتشار محتوای علمی، نمایش اسلایدی، رسانه و گفت‌وگوی زنده.

> **وضعیت:** در حال Production Hardening. کد قابلیت‌های اصلی وجود دارد، اما هر قابلیت فقط پس از تست integration روی Staging و تأیید عملیاتی، Production-ready محسوب می‌شود.

## قابلیت‌های محصول

- گردش‌کار مقاله از `draft` تا `published` و `archived`؛
- نقش‌ها و کنترل دسترسی سمت Backend؛
- نظر، رویداد فعالیت و سابقهٔ گردش‌کار؛
- مقاله و Deck دوزبانه با تجربهٔ RTL/LTR؛
- رسانه و Object Storage با URL امضاشده؛
- جلسهٔ زنده با LiveKit، نقش جلسه، E2EE اختیاری و Recording؛
- احراز هویت ایمیل/تلفن، OTP، OAuth و Verification؛
- Usage Gateway، Quota، Entitlement، Billing و Subscription؛
- AI server-side برای پیشنهاد عنوان و بازنویسی؛
- Liara Mailbox Worker برای Provisioning ایمیل؛
- Installer ویندوز برای آماده‌سازی محیط تحویل.

وجود کد به معنی فعال‌بودن همهٔ Providerها در Production نیست. وضعیت دقیق هر حوزه در [نقشهٔ وضعیت](docs/ROADMAP-8-STAGES-STATUS-fa.md) ثبت می‌شود.

## معماری Production

```text
Browser
  └─ Frontend React/Vite — Liara PaaS
       └─ Backend Fastify — Liara PaaS
            ├─ PostgreSQL — Liara DBaaS (منبع حقیقت)
            ├─ Object Storage — S3 API
            ├─ Mailbox Worker — Liara App مستقل
            ├─ LiveKit — سرویس مستقل
            ├─ SMS.ir / Liara Mail / Payment Provider
            └─ AI Gateway
                 └─ Providerها و سرویس‌های اختیاری n8n/OpenClaw/Open WebUI
```

اصول حاکم:

1. Backend منبع حقیقت Auth، RBAC، Workflow، Quota، Billing و دسترسی است.
2. Frontend هیچ پرداخت، نقش یا مجوزی را تأیید نمی‌کند.
3. PostgreSQL مستقل مسیر Production است؛ Supabase در اسپرینت ۵ به صورت کامل حذف و خارج شده است.
4. LiveKit فقط رسانهٔ بلادرنگ را حمل می‌کند؛ Token و Role از Backend صادر می‌شوند.
5. سرویس‌های AI اختیاری، Feature-Flagged و قابل خاموش‌شدن هستند.
6. Secretها فقط در GitHub/Liara نگهداری می‌شوند و وارد Git یا Bundle نمی‌شوند.

اسناد حاکم:

- [قرارداد معماری محصول](docs/PRODUCT-ARCHITECTURE-CONTRACT-fa.md)
- [وضعیت هشت حوزهٔ توسعه](docs/ROADMAP-8-STAGES-STATUS-fa.md)
- [نقشهٔ نهایی‌سازی](docs/finalization/roadmap-fa.md)
- [ADRهای معماری](docs/adr/README.md)

## وضعیت Supabase (خروج کامل — Decommissioned)

پوشهٔ تاریخی `supabase/` در اسپرینت ۵ به صورت کامل حذف شد و چک‌سام‌های آرشیوی آن در `docs/archive/legacy-supabase-manifest-2026-08-24.json` نگهداری می‌شوند. Runtime اصلی و مخزن دارای صفر باقیمانده (Zero Residue) هستند.

- هیچ وابستگی پکیجی از قبیل `@supabase/supabase-js` در پروژه وجود ندارد؛
- هیچ import یا فراخوانی کدی در فرانت‌اند یا بک‌اند وجود ندارد؛
- اسکریپت `scripts/check-architecture-contract.mjs` در هر بیلد و در CI عدم بازگشت هرگونه رفرنس قدیمی را بررسی می‌کند.

جزئیات: [LEGACY-SUPABASE-TRANSITION-fa.md](docs/LEGACY-SUPABASE-TRANSITION-fa.md).

## پیش‌نیازها

- Node.js `22.12.0`؛
- npm؛
- Docker و Docker Compose برای PostgreSQL محلی؛
- Git.

نسخهٔ Node در `.nvmrc` و `.node-version` ثبت شده است.

## اجرای محلی

### ۱. نصب وابستگی‌ها

```bash
npm ci
npm --prefix backend ci
npm --prefix installer ci
```

### ۲. ایجاد فایل‌های محیطی

```bash
cp .env.example .env
cp .env.local.example .env.local
cp backend/.env.example backend/.env
```

مقادیر محلی را جایگزین کنید. فایل‌های واقعی `.env` نباید Commit شوند.

### ۳. PostgreSQL و Backend

```bash
bash scripts/local-db.sh up
npm --prefix backend run migrate
npm --prefix backend run dev
```

Backend به‌صورت پیش‌فرض روی `http://localhost:8080` اجرا می‌شود.

### ۴. Frontend

```bash
npm run dev
```

Vite روی `http://localhost:8080` یا پورت آزاد بعدی اجرا می‌شود. در توسعهٔ دو سرویس مستقل، `VITE_API_URL` را به Backend تنظیم کنید.

## Quality Checks

```bash
# Frontend
npm run lint
npm run build
npm run verify:seo
npm audit --omit=dev --audit-level=high

# Backend
npm --prefix backend run check
npm --prefix backend run build
npm --prefix backend run migrate:dry-run
npm --prefix backend audit --omit=dev --audit-level=high

# Installer
npm --prefix installer run check
npm --prefix installer run build
```

Baseline فعلی در [گزارش Sprint 0](docs/finalization/sprint-00-report-fa.md) ثبت شده است. Lint و برخی Advisoryهای Dependency هنوز Blocker هستند و پنهان نشده‌اند.

## تست‌های عملیاتی

```bash
# نیازمند Backend، PostgreSQL و هویت تست
TEST_BASE_URL=http://localhost:8080 \
TEST_EMAIL=... \
TEST_PASSWORD=... \
npm --prefix backend run test:integration

# نیازمند k6
BASE_URL=http://localhost:8080 k6 run tests/k6/kaghazbaad-api.js
```

Credential تست باید فقط در Secret یا Environment محلی قرار گیرد.

## ساختار Repository

```text
.github/workflows/       CI/CD
backend/                 Fastify API، Worker و PostgreSQL migrations
backend/migrations/      Migrationهای فعال 001 تا 021
installer/               Windows installer
src/                     React frontend
scripts/                 ابزارهای محیط و Health Check
tests/                   آزمون‌های واحد بومی (Native Unit Tests) و تست‌های Smoke/Load
docs/                    معماری، وضعیت، Runbook و گزارش‌ها
```

## Branch و استقرار

- `main`: تنها منبع Production؛ Push موفق آن Deployment خودکار Liara را آغاز می‌کند.
- `integration/product-finalization`: خط تجمیع اسپرینت‌های نهایی‌سازی.
- `sprint/*`: تغییرات کوتاه‌عمر و قابل بازگشت.

Push مستقیم و Force Push به `main` ممنوع است. Required Checks و Pull Request باید پیش از Merge پاس شوند. Production بدون Commit موجود در `main` تغییر نمی‌کند.

## متغیرهای محیطی

Frontend فقط متغیرهای عمومی با پیشوند `VITE_` دریافت می‌کند. در وضعیت فعلی متغیر اصلی آن:

```text
VITE_API_URL
```

متغیرهای Backend در `backend/.env.example` مستند شده‌اند و حوزه‌های زیر را پوشش می‌دهند:

- Database و CORS؛
- Auth، OAuth، SMS و Email؛
- Object Storage؛
- LiveKit؛
- AI، Rate Limit و Cache؛
- Payment؛
- Liara Mailbox Worker.

هیچ Secret سمت سرور نباید با پیشوند `VITE_` تعریف شود.

## مشارکت

1. از خط مبنای مناسب Branch بسازید.
2. تغییر کوچک و هدفمند انجام دهید.
3. Build، Check و تست مرتبط را اجرا کنید.
4. مستندات، Environment example و Rollback را همگام کنید.
5. Pull Request بسازید و Required Checks را پاس کنید.

Template مربوط به Pull Request در `.github/pull_request_template.md` قرار دارد.

## مجوز

Apache License 2.0 — فایل [LICENSE](LICENSE).
