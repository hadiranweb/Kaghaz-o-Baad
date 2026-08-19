CREATE TABLE IF NOT EXISTS live_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  participant_identity TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_session_events_session_idx
  ON live_session_events(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS live_session_events_user_idx
  ON live_session_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS live_session_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  participant_identity TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  left_at TIMESTAMPTZ,
  duration_seconds NUMERIC(20, 3) NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  join_event_id TEXT NOT NULL UNIQUE,
  leave_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_session_presence_open_idx
  ON live_session_presence(session_id, participant_identity) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS live_session_presence_user_idx
  ON live_session_presence(user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS live_session_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('chat', 'question', 'reaction', 'hand_raise')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_session_interactions_session_idx
  ON live_session_interactions(session_id, created_at DESC);

INSERT INTO plan_parameters (parameter_key, unit, period, exhaustion_policy)
VALUES ('live.minutes', 'minute', 'monthly', 'deny')
ON CONFLICT (parameter_key) DO NOTHING;

INSERT INTO plan_parameter_values (plan_id, parameter_id, enabled, limit_value)
SELECT p.id, pp.id, TRUE,
  CASE p.plan_key WHEN 'free' THEN 60 WHEN 'student' THEN 300 WHEN 'professor' THEN 1200 END
FROM plans p CROSS JOIN plan_parameters pp
WHERE pp.parameter_key = 'live.minutes'
ON CONFLICT (plan_id, parameter_id) DO NOTHING;
