ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

ALTER TABLE phone_login_codes
  DROP CONSTRAINT IF EXISTS phone_login_codes_purpose_check;

ALTER TABLE phone_login_codes
  ADD CONSTRAINT phone_login_codes_purpose_check
  CHECK (purpose IN ('login', 'phone_verification'));

CREATE INDEX IF NOT EXISTS phone_login_codes_user_lookup_idx
  ON phone_login_codes(phone, purpose, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_phone_verified_idx
  ON profiles(phone)
  WHERE phone IS NOT NULL AND phone_verified_at IS NOT NULL;
