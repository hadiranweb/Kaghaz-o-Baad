# AI Stack Isolation Contract — ADR-0003 Enforcement

## Isolation Rules (Mandatory)

1. **No Production Database Access:**
   - Auxiliary AI services (`n8n-orchestrator`, `openclaw-runtime`, `open-webui-workspace`) must NOT contain `DATABASE_URL`, `POSTGRES_*`, or `SUPABASE_*` environment variables.
   - Any connection string for PostgreSQL in these manifests = deployment blocked.

2. **Only Backend API Endpoints:**
   - Egress allowed only to `kaghazbaad-backend-api` (public API endpoint).
   - All tool invocations from agents must go through `/api/v1/` routes with `Authorization: Bearer ...`.

3. **Secret Isolation:**
   - AI stack secrets (`N8N_ENCRYPTION_KEY`, `OPENCLAW_AGENT_ID`, `OPENWEBUI_ADMIN_TOKEN`) must NOT overlap with backend secrets (`AUTH_JWT_SECRET`, `LIARA_MAIL_API_TOKEN`).
   - Vault paths must be distinct (`vault/liara/n8n-*`, `vault/liara/openclaw-*`, `vault/liara/openwebui-*`).

4. **Health and Kill Switch:**
   - Every service has `/healthz` or `/readyz` endpoint.
   - `KILL_SWITCH_*` variables are set; switching to `enabled` must terminate the service immediately.

5. **Independent Rollback:**
   - AI stack rollback is independent of backend rollback.
   - Health failures trigger automatic rollback after `max_failed_deployments`.

6. **Feature Flags:**
   - `FEATURE_FLAG_AUXILIARY_AI` controls activation; disabled services return `503` with `service_disabled` message.
