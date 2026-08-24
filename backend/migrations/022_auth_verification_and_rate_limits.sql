-- 022_auth_verification_and_rate_limits.sql
-- Optimizes indexing for verified authentication factors, rate limits, and audit lookups.

CREATE INDEX IF NOT EXISTS users_email_verified_idx
  ON users(email) WHERE email_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS phone_login_codes_request_id_idx
  ON phone_login_codes(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_events_ip_outcome_idx
  ON auth_events(ip_address, outcome, created_at DESC) WHERE ip_address IS NOT NULL;
