CREATE TABLE IF NOT EXISTS circuit_breakers (
  service_name TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO circuit_breakers (service_name)
VALUES ('ai-provider'), ('smsir-api'), ('livekit')
ON CONFLICT (service_name) DO NOTHING;
