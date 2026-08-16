CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'void', 'expired')),
  currency CHAR(3) NOT NULL DEFAULT 'IRR',
  subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  plan_key TEXT,
  plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_minor = subtotal_minor - discount_minor)
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
  total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor = quantity * unit_amount_minor),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'expired')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_request_id TEXT,
  provider_payment_id TEXT,
  authority TEXT,
  redirect_url TEXT,
  failure_code TEXT,
  failure_message TEXT,
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX payment_attempts_provider_payment_idx ON payment_attempts (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX invoices_user_status_idx ON invoices (user_id, status, created_at DESC);
CREATE INDEX payment_attempts_invoice_idx ON payment_attempts (invoice_id, created_at DESC);

CREATE OR REPLACE FUNCTION validate_payment_attempt_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = NEW.invoice_id AND i.user_id = NEW.user_id
      AND i.total_minor = NEW.amount_minor AND i.currency = NEW.currency
      AND i.status IN ('issued', 'draft')
  ) THEN
    RAISE EXCEPTION 'payment_attempt_invoice_amount_mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_attempt_amount_guard
BEFORE INSERT ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION validate_payment_attempt_amount();
