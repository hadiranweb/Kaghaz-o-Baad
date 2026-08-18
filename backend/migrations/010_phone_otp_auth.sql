CREATE TABLE IF NOT EXISTS phone_login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  request_id TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_login_codes_lookup_idx
  ON phone_login_codes(phone, purpose, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS phone_login_codes_expiry_idx
  ON phone_login_codes(expires_at)
  WHERE consumed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON profiles(phone)
  WHERE phone IS NOT NULL AND phone <> '';
