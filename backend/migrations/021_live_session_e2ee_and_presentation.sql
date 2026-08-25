-- 021_live_session_e2ee_and_presentation.sql
-- Optimizes indexing for live sessions, presentation metadata, and participant presence tracking.

CREATE INDEX IF NOT EXISTS live_sessions_host_status_idx
  ON live_sessions(host_id, status, starts_at DESC);

CREATE INDEX IF NOT EXISTS live_session_presence_session_duration_idx
  ON live_session_presence(session_id, duration_seconds DESC);

CREATE INDEX IF NOT EXISTS live_session_events_event_type_idx
  ON live_session_events(event_type, occurred_at DESC);
