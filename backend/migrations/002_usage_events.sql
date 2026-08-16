CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  tool_name TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  pricing_version TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'timed_out')),
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0),
  units NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (units >= 0),
  currency TEXT,
  cost_minor BIGINT CHECK (cost_minor IS NULL OR cost_minor >= 0),
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_user_created_idx ON usage_events (user_id, created_at DESC);
CREATE INDEX usage_events_request_idx ON usage_events (request_id);
CREATE INDEX usage_events_feature_idx ON usage_events (feature_key, created_at DESC);
CREATE INDEX usage_events_provider_model_idx ON usage_events (provider, model, created_at DESC);
