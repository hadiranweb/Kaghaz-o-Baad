CREATE TABLE IF NOT EXISTS live_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  egress_id TEXT NOT NULL UNIQUE,
  output_type TEXT NOT NULL DEFAULT 'mp4' CHECK (output_type IN ('mp4', 'hls', 'audio')),
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'active', 'completed', 'failed', 'stopped')),
  object_key TEXT,
  object_url TEXT,
  duration_seconds NUMERIC(20, 3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  mime_type TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_recordings_session_idx
  ON live_recordings(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS live_recordings_status_idx
  ON live_recordings(status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS live_recordings_one_active_session_idx
  ON live_recordings(session_id)
  WHERE status IN ('starting', 'active');
