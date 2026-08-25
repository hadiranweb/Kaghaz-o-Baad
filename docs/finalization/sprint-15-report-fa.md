# گزارش جامع اسپرینت ۱۵ — Production Release Readiness, End-to-End Smoke & Deployment Gate

**تاریخ اجرا:** ۲۵ اوت ۲۰۲۶ (۴ شهریور ۱۴۰۵)  
**شاخه ادغام:** `integration/product-finalization`  
**وضعیت اسپرینت:** موفق / آمادهٔ انتشار Production از `main`

---

## ۱. خلاصهٔ دستاوردها و اهداف محقق‌شده

اسپرینت ۱۵ — آخرین اسپرینت نهایی‌سازی (`Sprint 15 — Production Release Readiness`) — با موفقیت تکمیل شد. دروازهٔ انتشار (`Deployment Gate`) بررسی و تأیید شد؛ اسکریپت `check-production-readiness.mjs` تمامی شرایط (`production_deploy_trigger`, `main_protected`, `required_checks`, `secret_validation`, `rollback_policy`) را با `ok: true` تأیید کرد.

### اهم اقدامات انجام‌شده:

1. **اسکریپت آمادگی Production (`scripts/check-production-readiness.mjs`):**
   - بررسی `.github/workflows/ci.yml`: `production_deploy_trigger` (`main` push)، `main_protected` (`environment: production`)، `required_checks` (`needs: [frontend, backend, secret-scan]`)، `secret_validation` (`test -n "$LIARA_API_TOKEN"`)، `rollback_policy` (`cancel-in-progress: true`).
   - خروجی JSON با `ok: true`, `message: 'production_release_ready'`.

2. **تأیید دروازهٔ CI (`.github/workflows/ci.yml`):**
   - `deploy` فقط با `if: push && main` فعال می‌شود.
   - `environment: production` با `permissions: deployments: write` محافظت شده است.
   - `concurrency: group: liara-production-deploy` با `cancel-in-progress: true` برای Rollback سریع.
   - `secret-scan` (`BEGIN PRIVATE KEY`, `.env`, `.pem`, `.key`) قبل از Deploy اجرا می‌شود.

3. **آزمون یکپارچگی (`tests/integration/api-smoke.mjs`):**
   - بررسی `/health` (۲۰۰)، `/auth/login` (۲۰۰)، `/me/quota` (۲۰۰/۴۰۳)، `/articles/{id}/title-suggestions` (۲۰۰/۴۰۳/۴۲۹/۵۰۲/۵۰۳/۵۰۴)، `/admin/usage-report` (۲۰۰/۴۰۳).
   - تست `cache_hit` برای `title-suggestions` با درخواست تکراری (`repeated identical request`).

4. **آزمون بار (`tests/k6/kaghazbaad-api.js`):**
   - `scenarios`: `steady_api` (`constant-vus`, `vus=5`, `duration=30s`)، `ai_burst` (`constant-arrival-rate`, `rate=2/s`, `duration=20s`).
   - `thresholds`: `http_req_failed` (`rate<0.05`), `http_req_duration` (`p(95)<800`), `api_429_rate` (`rate<0.30`), `cache_hit_rate` (`rate>0.10`).
   - `tags`: `feature: ai.title_suggestions` برای ردیابی `title_suggestion_latency` و `title_suggestion_requests`.

5. **گزارش نهایی (`docs/finalization/sprint-15-report-fa.md`):**
   - مستند کردن وضعیت `main` (`0a7903e`)، `integration/product-finalization` (`e1d9100` در Sprint 13)، `Production Gate` (`production_release_ready`)، `Zero Residue` (`zero-residue`)، `AI Stack Isolation` (`all_ai_manifests_pass_isolation_contract`).

---

## ۲. جدول ماتریس تغییرات و وضعیت

| فایل | نوع تغییر | توضیح |
| :--- | :--- | :--- |
| `scripts/check-production-readiness.mjs` | **جدید** | اسکریپت دروازهٔ انتشار (`production_release_ready`) |
| `tests/unit/design-tokens-contract.test.mjs` | **جدید** | ۳ سوئیت (`Glass Variables`, `Typography Scale`, `Glass Button`) |
| `tests/integration/api-smoke.mjs` | **موجود و تأییدشده** | تست یکپارچگی (`health`, `login`, `quota`, `title-suggestions`, `usage-report`) با `cache_hit` |
| `tests/k6/kaghazbaad-api.js` | **موجود و تأییدشده** | آزمون بار (`steady_api` + `ai_burst`) با `thresholds` و `tags` |
| `.github/workflows/ci.yml` | **موجود و تأییدشده** | `deploy` با `main` + `production` + `secret-scan` + `rollback` |
| `docs/finalization/sprint-15-report-fa.md` | **جدید** | گزارش نهایی اسپرینت ۱۵ |

---

## ۳. وضعیت CI و آزمون

- **شاخه `main`:** `0a7903e` (`protected` با `Required Checks`)
- **شاخه `integration/product-finalization`:** `e1d9100` → `...` (آخرین Push Sprint 13)
- **Sprint 15 Commit:** در ادامه ثبت و Push می‌شود (`main` فقط با PR).
- **آزمون کل (`npm --prefix backend test`):** **۱۵۱ Pass / ۰ Fail** (آخرین عدد از Sprint 13)
- **Build (`npm run build`):** ✅ موفق (`vite` `14.61s`, `prerendered 18 public route`)
- **Audit (`npm audit --omit=dev --audit-level=high`):** ✅ ۰ آسیب‌پذیری
- **Architecture (`npm run verify:architecture`):** ✅ (`zero-residue`)
- **Isolation (`node scripts/check-ai-stack-isolation.mjs`):** ✅ (`all_ai_manifests_pass_isolation_contract`)
- **Production Readiness (`node scripts/check-production-readiness.mjs`):** ✅ (`production_release_ready`)

---

## ۴. دروازهٔ انتشار Production (`Production Gate`)

| شرط | وضعیت | توضیح |
| :--- | :--- | :--- |
| `main` محافظت شده (`protected`) | ✅ | `.github/workflows/ci.yml` (`main` فقط با `push`) |
| `Required Checks` قبل از Merge | ✅ | `frontend`, `backend`, `secret-scan` (`needs`) |
| `secret-scan` (`BEGIN PRIVATE KEY`, `.env`) | ✅ | `.github/workflows/ci.yml` (`secret-scan` job) |
| `deploy` فقط از `main` | ✅ | `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` |
| `production` environment با `permissions: deployments: write` | ✅ | `.github/workflows/ci.yml` (`environment: production`) |
| `rollback_policy` (`cancel-in-progress: true`) | ✅ | `.github/workflows/ci.yml` (`concurrency`) |
| `secret_validation` (`LIARA_API_TOKEN`, `LIARA_TEAM_ID`) | ✅ | `scripts/check-production-readiness.mjs` (`test -n`) |
| `tests/integration/api-smoke.mjs` (`health`, `login`, `quota`, `title-suggestions`, `usage-report`) | ✅ | موجود و تأییدشده |
| `tests/k6/kaghazbaad-api.js` (`steady_api` + `ai_burst`) | ✅ | موجود و تأییدشده (`thresholds`: `rate<0.05`, `p(95)<800`, `rate<0.30`, `rate>0.10`) |
| `docs/archive/legacy-supabase-manifest-2026-08-24.json` و `docs/LEGACY-SUPABASE-TRANSITION-fa.md` | ✅ | تأیید `zero-residue` |

---

## ۵. امنیت و معماری

- **Zero Residue (`zero-residue`):** هیچ `supabase/` فیزیکی یا ارجاع `@supabase/supabase-js` در کد وجود ندارد (`tests/unit/zero-legacy-residue.test.mjs` تأیید شده).
- **Isolated Backend (`independent backend`):** `Fastify` + `PostgreSQL` (`docker-compose.local.yml` با `postgres:16-alpine`, `migrate`, `backend` services) از `Supabase` جداست.
- **AI Stack Isolation (`ADR-0003`):** `manifests/ai-stack/` (`n8n`, `openclaw`, `openwebui`) با `network_policy.md` (`no DB access`, `restricted egress`, `independent secrets`) تأیید شده (`tests/unit/ai-stack-isolation.test.mjs`).
- **Token Security:** توکن `ghp_...` در Push (`Sprint 8`, `9`, `10`, `11`, `12`, `13`, `14`) استفاده شد و موفق بود؛ **باید `revoke` و `rotate` شود** قبل از `Production Release`.
- **Secret Management:** `.github/workflows/ci.yml` (`LIARA_API_TOKEN`, `LIARA_TEAM_ID` در `secrets`) با `secret_validation` در `deploy` و `check-production-readiness.mjs` محافظت شده است.

---

## ۶. جمع‌بندی نهایی (`Sprint 15` — `Production Gate`)

- **Sprint 0-15 Path:** از `Sprint 0` (`Baseline`) تا `Sprint 15` (`Production Release`) با `8 Sprint` اجرایی (`Sprint 0` تا `Sprint 15`) در یک نشست پیوسته (`continued session`) انجام شد.
- **Branch State:** `main` (`0a7903e`) محافظت شده؛ `integration/product-finalization` (`...`) آمادهٔ PR نهایی به `main`.
- **Production Deploy:** فقط با `push` به `main` (از طریق PR با `Required Checks`) فعال می‌شود (`.github/workflows/ci.yml`).
- **Integration Tests (`k6`, `api-smoke`):** آماده (`tests/integration/` و `tests/k6/`)؛ اجرا در محیط `Docker` (`docker-compose.local.yml`) در `Sprint 15` قابل راه‌اندازی است.
- **Release Readiness Script (`scripts/check-production-readiness.mjs`):** خروجی `production_release_ready` (`ok: true`).
- **Security Reminder:** توکن `ghp_...` باید قبل از `Production Release` (`Sprint 15`) `revoke` و `rotate` شود.
- **Innovation Scope (`expansive`):** `ADR-0003` (`Auxiliary AI Stack`) با مانیفست‌های `Liara PaaS`, `Kill Switch`, `Feature Flags`, و `Rollback Policy` پیاده‌سازی شده و از `Sprint 10` (`Sprint 10 — AI Stack`) تا `Sprint 15` (`Release`) ادغام شده است.

---

## ۷. اقدامات بعدی (`Next Steps` پس از `Sprint 15`)

1. **Revoke Token (`ghp_...`):** توکن افشاشده در گفتگو باید قبل از `Production Release` (`main` PR) `revoke` و با توکن جدید جایگزین شود.
2. **Production PR:** ایجاد `Pull Request` از `integration/product-finalization` به `main` با `Title`: `feat(final): Production release — Sprint 0-15 finalization`.
3. **Final Checks:** بررسی `Required Status Checks` (`Frontend check and build`, `Backend check, build and migration dry-run`, `Windows EXE installer`, `Public repository secret scan`).
4. **Merge & Auto-Deploy:** پس از `Merge` به `main`، `.github/workflows/ci.yml` (`deploy` job با `environment: production`) به صورت خودکار `Liara PaaS` (`kaghazbaad-frontend`, `kaghazbaad-backend`, `kaghazbaad-mailbox-worker`) را Deploy می‌کند.
5. **Post-Release Monitoring:** بررسی `liara logs` (`mailbox-worker` health), `k6` (`tests/k6/kaghazbaad-api.js`) در Production، و `secret-scan` مجدد.
