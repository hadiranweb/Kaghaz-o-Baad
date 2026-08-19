-- Session-scoped LiveKit roles.
-- The session host remains canonical in live_sessions.host_id.
-- This table stores explicit speaker/viewer assignments for other users.
CREATE TABLE IF NOT EXISTS live_session_participants (
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('speaker', 'viewer')),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_session_participants_user_idx
  ON live_session_participants(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS live_session_participants_role_idx
  ON live_session_participants(session_id, role);
