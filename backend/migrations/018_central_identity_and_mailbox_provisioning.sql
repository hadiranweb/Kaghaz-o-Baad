-- 018_central_identity_and_mailbox_provisioning.sql
-- Purpose: decouple platform identity from login method and provider identities.
-- Compatible with the current independent Node/Fastify/PostgreSQL schema.
-- This migration is intentionally additive; application cutover follows separately.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A platform domain is configuration data, not a secret. The Liara API token remains
-- an environment secret and must never be stored in this table.
CREATE TABLE IF NOT EXISTS platform_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'liara_mail'
    CHECK (provider IN ('liara_mail', 'other')),
  mail_server_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_domains_domain_chk
    CHECK (domain = lower(domain) AND domain ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'),
  CONSTRAINT platform_domains_mail_server_id_chk
    CHECK (mail_server_id IS NULL OR mail_server_id ~ '^[0-9a-fA-F]{24}$'),
  CONSTRAINT platform_domains_domain_unique UNIQUE (domain)
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_domains_one_default_idx
  ON platform_domains (is_default) WHERE is_default;

INSERT INTO platform_domains (domain, provider, is_default, is_active)
VALUES ('kaghazobaad.ir', 'liara_mail', TRUE, TRUE)
ON CONFLICT (domain) DO UPDATE
SET provider = EXCLUDED.provider,
    is_active = TRUE,
    updated_at = now();

-- Keep users.id as the immutable relational primary key. platform_email is the
-- product-level identity; users.email remains temporarily for backward compatibility.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_email TEXT,
  ADD COLUMN IF NOT EXISTS platform_email_localpart TEXT,
  ADD COLUMN IF NOT EXISTS platform_email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS identity_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_identity_status_chk;
ALTER TABLE users ADD CONSTRAINT users_identity_status_chk
  CHECK (identity_status IN ('pending', 'active', 'suspended', 'deactivated', 'deletion_pending'));

-- Deterministic, non-guessable, provider-safe local part. UUID hex is 32 chars;
-- the prefix keeps this distinct from user-selected aliases and remains <= 64 chars.
UPDATE users
SET platform_email_localpart = 'user-' || replace(id::text, '-', '')
WHERE platform_email_localpart IS NULL;

UPDATE users
SET platform_email = platform_email_localpart || '@kaghazobaad.ir'
WHERE platform_email IS NULL;

ALTER TABLE users
  ALTER COLUMN platform_email_localpart SET NOT NULL,
  ALTER COLUMN platform_email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_platform_email_unique_idx
  ON users (lower(platform_email));
CREATE UNIQUE INDEX IF NOT EXISTS users_platform_email_localpart_unique_idx
  ON users (lower(platform_email_localpart));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_email_format_chk;
ALTER TABLE users ADD CONSTRAINT users_platform_email_format_chk
  CHECK (platform_email = lower(platform_email)
    AND platform_email_localpart = lower(platform_email_localpart)
    AND platform_email = platform_email_localpart || '@kaghazobaad.ir');

-- External accounts and password/phone login methods. provider_subject is the
-- immutable subject from the provider, never the provider's display email.
CREATE TABLE IF NOT EXISTS user_login_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL
    CHECK (provider IN ('google', 'github', 'password_email', 'phone_otp')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  provider_phone_e164 TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_login_identities_subject_chk CHECK (length(trim(provider_subject)) BETWEEN 1 AND 512),
  CONSTRAINT user_login_identities_verified_at_chk CHECK (is_verified OR verified_at IS NULL),
  CONSTRAINT user_login_identities_provider_unique UNIQUE (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS user_login_identities_user_idx
  ON user_login_identities (user_id, provider, created_at);

-- Verified contact factors are separate from provider identities so a user can
-- change a personal email or phone without changing users.id or platform_email.
CREATE TABLE IF NOT EXISTS user_contact_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('email', 'phone')),
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  verification_method TEXT CHECK (verification_method IN ('email_link', 'email_code', 'sms_otp', 'oauth_claim')),
  last_verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_contact_methods_value_chk CHECK (length(trim(value)) BETWEEN 3 AND 320),
  CONSTRAINT user_contact_methods_normalized_chk CHECK (normalized_value = lower(normalized_value)),
  CONSTRAINT user_contact_methods_verification_chk CHECK (
    (verified_at IS NULL AND verification_method IS NULL)
    OR (verified_at IS NOT NULL AND verification_method IS NOT NULL)
  ),
  CONSTRAINT user_contact_methods_unique_value UNIQUE (kind, normalized_value)
);
CREATE INDEX IF NOT EXISTS user_contact_methods_user_idx
  ON user_contact_methods (user_id, kind, is_primary);
CREATE UNIQUE INDEX IF NOT EXISTS user_contact_methods_one_primary_idx
  ON user_contact_methods (user_id, kind) WHERE is_primary;
-- The application must enforce at least one verified factor before activating a
-- newly created account. This partial index is intentionally not used for that
-- rule because PostgreSQL cannot express a cross-row OR constraint with an index.
-- Enforce it transactionally in the service layer and in the activation function.
CREATE OR REPLACE FUNCTION assert_user_has_verified_factor(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_contact_methods
    WHERE user_id = p_user_id AND verified_at IS NOT NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM user_login_identities
    WHERE user_id = p_user_id AND is_verified
  ) THEN
    RAISE EXCEPTION 'user_requires_verified_factor';
  END IF;
END;
$$;

-- Provider-side mailbox account belonging to the platform identity.
CREATE TABLE IF NOT EXISTS user_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  platform_domain_id UUID NOT NULL REFERENCES platform_domains(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'liara_mail'
    CHECK (provider IN ('liara_mail', 'other')),
  provider_mail_server_id TEXT NOT NULL,
  provider_account_id TEXT,
  account_name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'provisioning', 'active', 'suspended', 'deprovisioning', 'deleted', 'failed')),
  desired_state TEXT NOT NULL DEFAULT 'active'
    CHECK (desired_state IN ('active', 'suspended', 'deleted')),
  quota_bytes BIGINT,
  last_error_code TEXT,
  last_error_message TEXT,
  provisioned_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_mailboxes_server_id_chk CHECK (provider_mail_server_id ~ '^[0-9a-fA-F]{24}$'),
  CONSTRAINT user_mailboxes_account_name_chk CHECK (
    account_name = lower(account_name)
    AND length(account_name) BETWEEN 1 AND 64
    AND account_name ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
  ),
  CONSTRAINT user_mailboxes_provider_account_id_chk CHECK (
    provider_account_id IS NULL OR provider_account_id ~ '^[0-9a-fA-F]{24}$'
  ),
  CONSTRAINT user_mailboxes_server_account_unique UNIQUE (provider_mail_server_id, account_name),
  CONSTRAINT user_mailboxes_address_unique UNIQUE (address)
);
CREATE INDEX IF NOT EXISTS user_mailboxes_status_idx
  ON user_mailboxes (status, desired_state, updated_at);

CREATE OR REPLACE FUNCTION validate_user_mailbox_address()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_domain TEXT;
BEGIN
  SELECT domain INTO v_domain FROM platform_domains WHERE id = NEW.platform_domain_id AND is_active;
  IF v_domain IS NULL OR NEW.address <> NEW.account_name || '@' || v_domain THEN
    RAISE EXCEPTION 'user_mailbox_address_mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_mailboxes_validate_address ON user_mailboxes;
CREATE TRIGGER user_mailboxes_validate_address
BEFORE INSERT OR UPDATE OF platform_domain_id, account_name, address ON user_mailboxes
FOR EACH ROW EXECUTE FUNCTION validate_user_mailbox_address();

-- Outbox/worker queue for Liara provisioning. The API token is not stored here.
CREATE TABLE IF NOT EXISTS mailbox_provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES user_mailboxes(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'reconcile', 'delete')),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'retryable', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  provider_http_status INTEGER,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error_code TEXT,
  last_error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mailbox_jobs_claim_idx
  ON mailbox_provisioning_jobs (status, available_at, created_at)
  WHERE status IN ('queued', 'retryable');
CREATE UNIQUE INDEX IF NOT EXISTS mailbox_one_open_create_job_idx
  ON mailbox_provisioning_jobs (mailbox_id, operation)
  WHERE operation = 'create' AND status IN ('queued', 'running', 'retryable');

-- Service-level bindings provide a stable authorization subject for future n8n,
-- Open WebUI, OpenClaw, LiveKit, storage and other integrations.
CREATE TABLE IF NOT EXISTS user_service_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL
    CHECK (service IN ('mailbox', 'storage', 'n8n', 'openwebui', 'openclaw', 'livekit')),
  resource_key TEXT NOT NULL,
  provider_resource_id TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_service_bindings_unique UNIQUE (user_id, service, resource_key)
);
CREATE INDEX IF NOT EXISTS user_service_bindings_lookup_idx
  ON user_service_bindings (user_id, service, status);

CREATE TABLE IF NOT EXISTS identity_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'linked', 'unlinked', 'verified', 'changed', 'rejected', 'merged')),
  object_type TEXT NOT NULL CHECK (object_type IN ('login_identity', 'contact_method', 'mailbox', 'service_binding')),
  object_id UUID,
  provider TEXT,
  request_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_link_events_user_idx
  ON identity_link_events (user_id, created_at DESC);

-- Backfill existing email accounts as password identities and personal contacts.
INSERT INTO user_login_identities (user_id, provider, provider_subject, provider_email, is_verified, verified_at)
SELECT id, 'password_email', lower(email), lower(email), (email_verified_at IS NOT NULL), email_verified_at
FROM users
WHERE email IS NOT NULL
ON CONFLICT (provider, provider_subject) DO NOTHING;

INSERT INTO user_contact_methods (user_id, kind, value, normalized_value, is_primary, is_login_enabled, verified_at, verification_method, last_verified_at)
SELECT id, 'email', email, lower(email), TRUE, TRUE, email_verified_at,
       CASE WHEN email_verified_at IS NULL THEN NULL ELSE 'email_link' END,
       email_verified_at
FROM users
WHERE email IS NOT NULL
ON CONFLICT (kind, normalized_value) DO NOTHING;

-- Profiles already contain phone in the current schema. Backfill it as an
-- unverified phone factor; verification status must come from the OTP flow.
INSERT INTO user_contact_methods (user_id, kind, value, normalized_value, is_primary, is_login_enabled)
SELECT p.user_id, 'phone', p.phone, p.phone, FALSE, TRUE
FROM profiles p
WHERE p.phone IS NOT NULL AND length(trim(p.phone)) >= 3
ON CONFLICT (kind, normalized_value) DO NOTHING;

-- Keep updated_at behavior explicit for tables created by this migration.
CREATE OR REPLACE FUNCTION touch_central_identity_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_domains_touch_updated_at ON platform_domains;
CREATE TRIGGER platform_domains_touch_updated_at BEFORE UPDATE ON platform_domains
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS users_touch_identity_updated_at ON users;
CREATE TRIGGER users_touch_identity_updated_at BEFORE UPDATE OF platform_email, platform_email_localpart, identity_status, identity_metadata ON users
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS user_login_identities_touch_updated_at ON user_login_identities;
CREATE TRIGGER user_login_identities_touch_updated_at BEFORE UPDATE ON user_login_identities
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS user_contact_methods_touch_updated_at ON user_contact_methods;
CREATE TRIGGER user_contact_methods_touch_updated_at BEFORE UPDATE ON user_contact_methods
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS user_mailboxes_touch_updated_at ON user_mailboxes;
CREATE TRIGGER user_mailboxes_touch_updated_at BEFORE UPDATE ON user_mailboxes
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS mailbox_jobs_touch_updated_at ON mailbox_provisioning_jobs;
CREATE TRIGGER mailbox_jobs_touch_updated_at BEFORE UPDATE ON mailbox_provisioning_jobs
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();
DROP TRIGGER IF EXISTS user_service_bindings_touch_updated_at ON user_service_bindings;
CREATE TRIGGER user_service_bindings_touch_updated_at BEFORE UPDATE ON user_service_bindings
FOR EACH ROW EXECUTE FUNCTION touch_central_identity_updated_at();

COMMIT;
