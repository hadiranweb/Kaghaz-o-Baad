# ADR-0003 Implementation Checklist — Auxiliary AI Stack

## Deployment Manifests

- [x] `manifests/ai-stack/n8n-deploy.yml` — Liara PaaS deployment spec
- [x] `manifests/ai-stack/openclaw-deploy.yml` — Agent runtime spec
- [x] `manifests/ai-stack/openwebui-deploy.yml` — Private workspace spec
- [x] `manifests/ai-stack/network-policy.md` — Isolation contract

## Isolation Contracts Verified

- [x] No `DATABASE_URL` in any manifest
- [x] No `SUPABASE_*` variables
- [x] No backend secrets (`AUTH_JWT_SECRET`, `LIARA_MAIL_API_TOKEN`) shared
- [x] Egress restricted to `kaghazbaad-backend-api`
- [x] Each service has independent health check endpoint
- [x] Kill switches (`KILL_SWITCH_*`) declared
- [x] Feature flags (`FEATURE_FLAG_AUXILIARY_AI`) declared
- [x] Independent rollback policies per service

## Health & Monitoring

- [x] `/healthz` or `/readyz` for all services
- [x] `check-ai-stack-isolation.mjs` passes
- [x] `tests/unit/ai-stack-isolation.test.mjs` passes

## Security & Governance

- [x] Secret isolation enforced (`vault/liara/n8n-*`, `openclaw-*`, `openwebui-*`)
- [x] No direct production DB access allowed
- [x] Human approval required for publishable output (documented in contract)
- [x] Agent scopes limited to `user-session-only`

## Production Readiness

- [ ] Deploy to Liara staging (requires environment secrets)
- [ ] Verify health endpoints respond in staging
- [ ] Confirm kill switch disables service within 30s
- [ ] Confirm rollback triggers on health failure
