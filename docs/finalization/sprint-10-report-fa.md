# گزارش جامع اسپرینت ۱۰ — Auxiliary AI Stack (ADR-0003: n8n, OpenClaw, Open WebUI)

**تاریخ اجرا:** ۲۵ اوت ۲۰۲۶ (۴ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ ادغام و بررسی در CI

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

در اسپرینت ۱۰، پشتهٔ کمکی هوش مصنوعی (Auxiliary AI Stack) مطابق ADR-0003 آماده‌سازی و مستند شد. مانیفست‌های استقرار Liara PaaS برای `n8n`, `OpenClaw` و `Open WebUI` ایجاد شدند؛ مرز مطلق استقلال از هستهٔ محصول اعمال و قرارداد ایزولاسیون (`network-policy.md`) تثبیت شد. اسکریپت بررسی ایزولاسیون (`check-ai-stack-isolation.mjs`) و تست‌های بومی (`tests/unit/ai-stack-isolation.test.mjs`) اضافه شدند.

### اهم اقدامات انجام‌شده:

1. **ایجاد مانیفست‌های استقرار (`manifests/ai-stack/`):**
   - `n8n-deploy.yml`: سرویس Orchestrator با `port: 5678`، `runtime: node:22-alpine`، `replicas: 1`، `health_checks: /healthz`، `feature_flag` و `kill_switch` فعال.
   - `openclaw-deploy.yml`: Runtime عامل محدود (`python:3.12-slim`) با `port: 8081`، `scope_limit: user-session-only`، `egress` محدود به `kaghazbaad-backend-api`، `rollback_policy` مستقل.
   - `openwebui-deploy.yml`: Workspace خصوصی (`port: 3000`) با `deny_public: true` در `ingress`، `admin-vpn` و `backend-management-gateway` به عنوان منابع مجاز.

2. **قرارداد ایزولاسیون (`manifests/ai-stack/network-policy.md`):**
   - ممنوعیت `DATABASE_URL`، `POSTGRES_*` و `SUPABASE_*` در همهٔ مانیفست‌ها.
   - جداسازی Secret (`vault/liara/n8n-*`, `openclaw-*`, `openwebui-*`) از Secret هسته (`AUTH_JWT_SECRET`, `LIARA_MAIL_API_TOKEN`).
   - الزام `kill_switch` و `feature_flag` برای هر سرویس.
   - محدودیت `egress` فقط به `kaghazbaad-backend-api`.

3. **اسکریپت بررسی ایزولاسیون (`scripts/check-ai-stack-isolation.mjs`):**
   - اسکن خودکار فایل‌های `.yml` در `manifests/ai-stack` برای یافتن الگوهای ممنوعه (`DATABASE_URL`, `POSTGRES_`, `SUPABASE_`, `LIARA_MAIL_API_TOKEN`, `AUTH_JWT_SECRET`).
   - خروجی JSON با `ok: true/false` و `message` دقیق.

4. **تست‌های واحد بومی (`tests/unit/ai-stack-isolation.test.mjs`):**
   - بررسی عدم وجود متغیرهای پایگاه‌داده در مانیفست‌ها.
   - بررسی وجود `FEATURE_FLAG_AUXILIARY_AI` و `KILL_SWITCH_*` در هر فایل.

5. **چک‌لیست پیاده‌سازی ADR-0003 (`docs/adr/0003-implementation-checklist.md`):**
   - فهرست کامل مانیفست‌ها، قراردادهای ایزولاسیون، سلامت و امنیت، و مراحل آمادگی Production.

---

## ۲. تغییرات کد و معماری

| فایل | نوع تغییر | توضیح |
| :--- | :--- | :--- |
| `manifests/ai-stack/n8n-deploy.yml` | **جدید** | مانیفست Liara برای n8n با ایزولاسیون شبکه و Secret مستقل |
| `manifests/ai-stack/openclaw-deploy.yml` | **جدید** | مانیفست Liara برای OpenClaw با Scope محدود و Egress محدود |
| `manifests/ai-stack/openwebui-deploy.yml` | **جدید** | مانیفست Liara برای Open WebUI با Deny Public و Admin VPN |
| `manifests/ai-stack/network-policy.md` | **جدید** | قرارداد ایزولاسیون ADR-0003 (DB ممنوع، Secret جداسازی شده، Egress محدود) |
| `scripts/check-ai-stack-isolation.mjs` | **جدید** | اسکریپت خودکار بررسی ایزولاسیون با خروجی JSON |
| `tests/unit/ai-stack-isolation.test.mjs` | **جدید** | ۲ آزمون بومی برای ایزولاسیون مانیفست و وجود Kill Switch |
| `docs/adr/0003-implementation-checklist.md` | **جدید** | چک‌لیست پیاده‌سازی ADR-0003 |
| `docs/finalization/sprint-10-report-fa.md` | **جدید** | گزارش اسپرینت ۱۰ |

---

## ۳. وضعیت CI و آزمون

- **شاخه فعال:** `integration/product-finalization`
- **Commit جدید:** `...` (در ادامه ثبت می‌شود)
- **آزمون کل:** **۱۴۰ Pass / ۰ Fail** (افزایش نسبت به ۱۳۸ در اسپرینت ۹)
  - `tests/unit/ai-stack-isolation.test.mjs`: ۲ Pass
- `npm --prefix backend test`: ✅
- `npm --prefix backend run build`: ✅ (۰ خطا)
- `npm run verify:architecture`: ✅ (`zero-residue`)
- `npm --prefix backend audit --omit=dev --audit-level=high`: ✅ ۰ آسیب‌پذیری
- `npm run build` (فرانت‌اند): ✅ موفق
- `node scripts/check-ai-stack-isolation.mjs`: ✅ (`all_ai_manifests_pass_isolation_contract`)

---

## ۴. امنیت و معماری

- **ایزولاسیون مطلق:** هیچ مانیفست `DATABASE_URL` یا Secret هسته (`AUTH_JWT_SECRET`, `LIARA_MAIL_API_TOKEN`) را شامل نمی‌شود.
- **Kill Switch / Feature Flag:** هر سرویس (`n8n`, `OpenClaw`, `Open WebUI`) دارای `FEATURE_FLAG_AUXILIARY_AI` و `KILL_SWITCH_*` است.
- **Rollback مستقل:** هر سرویس `rollback_policy` مستقل از هسته دارد (`max_failed_deployments`: ۲ یا ۳).
- **Secret جداسازی شده:** `vault/liara/n8n-*`, `openclaw-*`, `openwebui-*` با `AUTH_JWT_SECRET` یا `LIARA_MAIL_API_TOKEN` تداخلی ندارند.
- **Egress محدود:** فقط `kaghazbaad-backend-api` مجاز است؛ `deny_all_others: true` در همهٔ مانیفست‌ها.
- **Public Deny:** `openwebui-deploy.yml` دارای `deny_public: true` است؛ فقط `admin-vpn` و `backend-management-gateway` دسترسی دارند.

---

## ۵. دورنما و نقشهٔ راه اسپرینت‌های آینده (۱۱ تا ۱۵)

```text
اسپرینت ۱۰ (تکمیل شد): Auxiliary AI Stack / ADR-0003
      ↓
اسپرینت ۱۱ (Sprint 11 — Frontend Core & State Alignment):
   - حذف کد مرده فرانت‌اند و هماهنگ‌سازی با Fastify API.
   - مدیریت وضعیت با TanStack Query و Contextهای Auth/Language.

اسپرینت ۱۲ (Sprint 12 — Creative UI Integration / Phase 1):
   - سیستم طراحی مدرن MengTo-inspired و کامپوننت‌های تعاملی جدید.

اسپرینت ۱۳ (Sprint 13 — Creative UI / Phase 2):
   - کتابخوان سه‌بعدی با داده‌های زنده و اسلایدهای تعاملی.

اسپرینت ۱۴ (Sprint 14 — Public Showcase, SEO & Legal/eNamad):
   - پیش‌نمایش صفحات عمومی، متاتگ‌ها، صفحات قانونی و اینماد.

اسپرینت ۱۵ (Sprint 15 — Production Release Readiness):
   - تست‌های یکپارچگی نهایی k6، PR نهایی به `main` و فعال‌سازی Deploy خودکار Production از `main`.
```

---

## ۶. خطاها و مشکلات مستندشده

- **هیچ خطای جدید در CI ایجاد نشده است.**
- **مشکل امنیتی مستمر:** توکن `ghp_...` افشاشده در گفتگو؛ باید `revoke` و `rotate` شود.
- **محدودیت محیط:** `docker` و `psql` در دسترس نیستند؛ تست‌های یکپارچگی (`api-smoke.mjs`, `k6`) در اسپرینت‌های بعدی با راه‌اندازی Docker اجرا می‌شوند.
- **وضعیت AI Stack:** مانیفست‌ها آماده‌اند اما Deploy واقعی روی Liara نیازمند تنظیم Secret (`vault/liara/n8n-*`, `openclaw-*`, `openwebui-*`) و تأیید `Feature Flag` در محیط Production است.
- **وضعیت Production:** `main` فقط با PR/Required Checks Merge می‌شود؛ Deploy خودکار از `main` فعال است.

---

## ۷. جمع‌بندی اجرایی

- تغییرات کد: **۸ فایل جدید/اصلاح‌شده** (۳ مانیفست + ۱ Network Policy + ۱ Script + ۱ Test + ۱ Checklist + ۱ Report).
- آزمون‌ها: **۱۴۰ Pass / ۰ Fail** (افزایش ۲ آزمون نسبت به ۱۳۸ در اسپرینت ۹).
- Build: **Backend (`tsc`) ۰ خطا** | **Frontend (`vite`) موفق**.
- Audit: **۰ آسیب‌پذیری**.
- Architecture: **تأیید شده (`zero-residue`)**.
- Isolation Contract: **تأیید شده (`all_ai_manifests_pass_isolation_contract`)**.
- Push Policy: فقط به `integration/product-finalization`؛ `main` با Required Checks محافظت شده است.
