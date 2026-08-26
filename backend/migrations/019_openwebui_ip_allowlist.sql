BEGIN;

CREATE TABLE IF NOT EXISTS openwebui_ip_allowlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr CIDR NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT openwebui_ip_allowlist_entries_cidr_unique UNIQUE (cidr),
  CONSTRAINT openwebui_ip_allowlist_entries_label_length CHECK (char_length(label) <= 160)
);

CREATE INDEX IF NOT EXISTS openwebui_ip_allowlist_entries_enabled_idx
  ON openwebui_ip_allowlist_entries (enabled, cidr);

CREATE TABLE IF NOT EXISTS openwebui_edge_sync_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  cloudflare_list_id TEXT,
  cloudflare_ruleset_id TEXT,
  cloudflare_rule_id TEXT,
  desired_revision INTEGER NOT NULL DEFAULT 0 CHECK (desired_revision >= 0),
  applied_revision INTEGER NOT NULL DEFAULT 0 CHECK (applied_revision >= 0),
  last_sync_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (last_sync_status IN ('not_configured', 'pending', 'syncing', 'succeeded', 'failed')),
  last_sync_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO openwebui_edge_sync_state (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS openwebui_edge_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('entry_created', 'entry_updated', 'entry_deleted', 'sync_requested', 'sync_succeeded', 'sync_failed')),
  entry_id UUID REFERENCES openwebui_ip_allowlist_entries(id) ON DELETE SET NULL,
  request_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS openwebui_edge_audit_events_created_idx
  ON openwebui_edge_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS openwebui_edge_audit_events_actor_idx
  ON openwebui_edge_audit_events (actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_openwebui_edge_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS openwebui_ip_allowlist_entries_touch_updated_at ON openwebui_ip_allowlist_entries;
CREATE TRIGGER openwebui_ip_allowlist_entries_touch_updated_at
BEFORE UPDATE ON openwebui_ip_allowlist_entries
FOR EACH ROW EXECUTE FUNCTION touch_openwebui_edge_updated_at();

DROP TRIGGER IF EXISTS openwebui_edge_sync_state_touch_updated_at ON openwebui_edge_sync_state;
CREATE TRIGGER openwebui_edge_sync_state_touch_updated_at
BEFORE UPDATE ON openwebui_edge_sync_state
FOR EACH ROW EXECUTE FUNCTION touch_openwebui_edge_updated_at();

COMMIT;
