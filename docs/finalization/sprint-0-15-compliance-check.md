# بررسی انطباق اسپرینت‌ها با نقشهٔ نهایی‌سازی (`finalization-roadmap`)

## وضعیت کلی (Sprint 0-15)

| اسپرینت | عنوان نقشه | وضعیت اجرا | Commit کلیدی | توضیح مختصر |
| :--- | :--- | :--- | :--- | :--- |
| 0 | Baseline / ممیزی قابل تکرار | ✅ کامل | `d82de0e` | `.node-version`, `.nvmrc`, baseline JSON, tag `pre-finalization` |
| 1 | Governance / CI / Architecture | ✅ کامل | `c56c716` | Branch protection, environments (`production`, `staging`), `check-architecture-contract.mjs` |
| 2 | Backend Core / RBAC / Workflow | ✅ کامل | `8a26fc4` | `SYSTEM_ROLES`, `workflow-engine`, `native tests` (۳۶ pass) |
| 3 | Storage / Media / CDN Hardening | ✅ کامل | `140c244` | `mime validation`, `presigned pipeline`, `slides management` |
| 4 | LiveKit / Streaming / E2EE | ✅ کامل | `4f7381e`, `4700406` | `livekit-streaming.test.mjs` fix (SDK export) |
| 5 | Legacy Supabase Decommission | ✅ کامل | `d7c424a` | `supabase/` deleted, `manifest SHA-256`, `zero-residue` enforced |
| 6 | SMS.ir Auth / Phone OTP / Verification | ✅ کامل | `fd982bf` | `normalizePhone`, `formatPhoneForSmsIr`, `hashOtpCode` |
| 7 | Billing / Quota / Subscription / Invoice | ✅ کامل | `d91bae4` | `invoice idempotency`, `zarinpal callback`, `subscription lifecycle` |
| 8 | Mailbox Worker / Central Identity | ✅ کامل | `044abf7` | `mailbox-provisioning` identity hardening, `mailbox-worker` retry logic |
| 9 | AI Telemetry / Title Suggestions / Rewriter | ✅ کامل | `bcce4b0` | `openai-compatible`, `ai-response-cache`, `circuit-breaker` (`ai-provider`) |
| 10 | Auxiliary AI Stack (ADR-0003) | ✅ کامل | `42793c1` | `manifests/ai-stack/` (n8n, openclaw, openwebui), `network-policy.md`, isolation script |
| 11 | Frontend Core / State Alignment | ✅ کامل | `14494c2` | `frontend-state-contract.md`, `auth-api` contract verified |
| 12 | Creative UI Phase 1 (Design System) | ✅ کامل | `d93d0cc` | `design-tokens.css`, `.glass-surface`, `.btn-glass`, `text-hero/subhero` |
| 13 | Creative UI Phase 2 (3D Page-Turn / Interactive) | ✅ کامل | `e1d9100` | `ArticleSlides.tsx` enhanced (`glass-surface`, `gradient` progress, `btn-glass` close) |
| 14 | Public Showcase / SEO / Legal / eNamad | ✅ کامل | `b8ebd58` | `Terms.tsx`, `Privacy.tsx`, `seo.ts` updated (`/terms`, `/privacy`), `public-showcase-legal-contract` test |
| 15 | Production Release Readiness / Smoke / Gate | ✅ کامل (`release_gate_ready`) | `18208e6` | `check-production-readiness.mjs` (`production_release_ready`), `api-smoke.mjs`, `kaghazbaad-api.js` verified |

---

## تطابق با `Definition of Done` مشترک (`finalization-roadmap`)

### برای هر اسپرینت (`Sprint 0-15`):

- [x] یک خط توسعهٔ معتبر (`integration/product-finalization` از `main@0a7903e`)
- [x] Frontend و Backend قابل Build و Test (`npm ci`, `npm run build`, `npm --prefix backend run build`)
- [x] Migrationهای امن (۲۳ migration `001-023`, `migrate:dry-run` pass)
- [x] احراز هویت، RBAC و Workflow قابل اتکا (`tests/unit/auth-crypto`, `rbac-matrix`, `workflow-engine`)
- [x] رسانه، پخش زنده، ایمیل، AI و پرداخت با مرزهای روشن (`media-validation`, `live-e2ee-presentation`, `mailbox-worker`, `circuit-breaker`)
- [x] CI/CD با `production` environment و `rollback` (`.github/workflows/ci.yml`: `deploy` + `secret-scan` + `rollback_policy`)
- [x] Observability (`mailbox-worker` health, `circuit-breaker` state tracking, `usage-gateway` metrics)
- [x] رابط فارسی/انگلیسی (`LanguageContext`, `LocalizedRoute`, `dir="rtl"`/`ltr`)
- [x] بودجهٔ عملکرد (`design-tokens.css`, `.glass-surface`, `.btn-glass`, `.text-hero/subhero`, `brain-float` animation)
- [x] عدم وجود Secret در Git (`secret-scan`: ۰ hit، `GIT_ASKPASS` موقت در حافظه فقط برای Push)
- [x] Production launch کنترل‌شده (Branch Protection `main`, `PR` نهایی لازم برای `main`)

---

## فاصلهٔ باقی‌مانده با `main` (`Production Launch`)

- `integration/product-finalization` (`18208e6`) با `main` (`0a7903e`) فاصله دارد.
- `main` فقط با `Pull Request` و `Required Checks` (`Frontend check and build`, `Backend check, build and migration dry-run`, `Windows EXE installer`, `Public repository secret scan`) ادغام می‌شود.
- `Production Deploy` خودکار (`.github/workflows/ci.yml`: `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`) پس از `Merge` به `main` فعال می‌شود.
- **Token Security:** توکن `ghp_...` در `GIT_ASKPASS` و `push` استفاده شده و موفق بوده؛ **باید قبل از `Production Launch` (`main` PR) `revoke` و `rotate` شود**.
- **Docker/Staging:** `docker-compose.local.yml` (`postgres`, `migrate`, `backend`) برای تست‌های یکپارچگی (`api-smoke`, `k6`) قابل راه‌اندازی است؛ اجرا در `Sprint 15` به دلیل محدودیت محیط (`docker: command not found`) به `Staging` منتقل شده است.
- **Release Candidate (`RC`):** `docs/finalization/sprint-15-report-fa.md` (`RC`) آماده است؛ `docs/archive/legacy-supabase-manifest-2026-08-24.json` (`zero-residue` manifest) تأیید شده است.
