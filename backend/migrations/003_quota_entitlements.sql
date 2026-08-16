CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'daily', 'lifetime')),
  exhaustion_policy TEXT NOT NULL DEFAULT 'deny' CHECK (exhaustion_policy IN ('deny', 'allow_overage')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_parameter_values (
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES plan_parameters(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value NUMERIC(20, 6) NOT NULL CHECK (limit_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, parameter_id)
);

CREATE TABLE entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX entitlements_one_active_user_idx ON entitlements (user_id) WHERE status = 'active';
CREATE INDEX entitlements_lookup_idx ON entitlements (user_id, status, starts_at, ends_at);

CREATE TABLE quota_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES plan_parameters(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ,
  used_units NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  reserved_units NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, parameter_id, period_start)
);

CREATE TABLE quota_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES plan_parameters(id),
  request_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  reserved_units NUMERIC(20, 6) NOT NULL CHECK (reserved_units > 0),
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'committed', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, request_id, feature_key)
);

INSERT INTO plans (plan_key, name_fa, name_en) VALUES
  ('free', 'رایگان', 'Free'),
  ('student', 'دانشجویی', 'Student'),
  ('professor', 'استادی', 'Professor')
ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_parameters (parameter_key, unit, period, exhaustion_policy) VALUES
  ('ai.title_suggestions', 'request', 'monthly', 'deny')
ON CONFLICT (parameter_key) DO NOTHING;

INSERT INTO plan_parameter_values (plan_id, parameter_id, enabled, limit_value)
SELECT p.id, pp.id, TRUE,
  CASE p.plan_key WHEN 'free' THEN 5 WHEN 'student' THEN 50 WHEN 'professor' THEN 200 END
FROM plans p CROSS JOIN plan_parameters pp
WHERE pp.parameter_key = 'ai.title_suggestions'
ON CONFLICT (plan_id, parameter_id) DO NOTHING;

CREATE INDEX quota_reservations_user_idx ON quota_reservations (user_id, created_at DESC);
CREATE INDEX quota_counters_user_period_idx ON quota_counters (user_id, period_start DESC);

INSERT INTO entitlements (user_id, plan_id, status, source)
SELECT u.id, p.id, 'active', 'migration_default_free'
FROM users u
JOIN plans p ON p.plan_key = 'free'
WHERE NOT EXISTS (
  SELECT 1 FROM entitlements e WHERE e.user_id = u.id AND e.status = 'active'
);
