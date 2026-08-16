CREATE TABLE ai_response_cache (
  cache_key TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_response_cache_user_feature_idx ON ai_response_cache (user_id, feature_key, expires_at);
CREATE INDEX ai_response_cache_expiry_idx ON ai_response_cache (expires_at);
