CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'grace', 'cancelled', 'expired')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
  currency CHAR(3) NOT NULL DEFAULT 'IRR',
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  grace_period_end TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  provider TEXT,
  provider_subscription_id TEXT,
  latest_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_period_end > current_period_start),
  CHECK (grace_period_end IS NULL OR grace_period_end >= current_period_end)
);

CREATE UNIQUE INDEX subscriptions_one_live_user_idx ON subscriptions(user_id)
WHERE status IN ('active', 'past_due', 'grace');
CREATE UNIQUE INDEX subscriptions_provider_id_idx ON subscriptions(provider, provider_subscription_id)
WHERE provider IS NOT NULL AND provider_subscription_id IS NOT NULL;
CREATE INDEX subscriptions_user_status_idx ON subscriptions(user_id, status, current_period_end DESC);

ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS entitlements_subscription_idx ON entitlements(subscription_id);

INSERT INTO subscriptions (user_id, plan_id, status, billing_period, currency, amount_minor, current_period_start, current_period_end, auto_renew)
SELECT e.user_id, e.plan_id, CASE WHEN e.ends_at IS NULL OR e.ends_at > now() THEN 'active' ELSE 'expired' END,
  'monthly', 'IRR', 0, e.starts_at, COALESCE(e.ends_at, e.starts_at + interval '30 days'), FALSE
FROM entitlements e
WHERE e.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = e.user_id AND s.status IN ('active','past_due','grace'));

UPDATE entitlements e SET subscription_id = s.id
FROM subscriptions s
WHERE s.user_id = e.user_id AND e.status = 'active' AND e.subscription_id IS NULL
  AND s.status IN ('active','past_due','grace');
