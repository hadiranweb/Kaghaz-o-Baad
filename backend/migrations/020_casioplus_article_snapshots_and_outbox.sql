ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS content_revision BIGINT NOT NULL DEFAULT 1,
  ADD CONSTRAINT articles_content_revision_positive CHECK (content_revision >= 1);

CREATE TABLE article_content_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  content_revision BIGINT NOT NULL CHECK (content_revision >= 1),
  snapshot_schema_version TEXT NOT NULL DEFAULT 'kaghazbaad.article-snapshot.v1',
  canonical_payload JSONB,
  content_sha256 CHAR(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_until TIMESTAMPTZ,
  purged_at TIMESTAMPTZ,
  CONSTRAINT article_content_snapshots_payload_lifecycle CHECK (
    (purged_at IS NULL AND canonical_payload IS NOT NULL)
    OR (purged_at IS NOT NULL AND canonical_payload IS NULL)
  ),
  UNIQUE (article_id, content_revision)
);

CREATE INDEX article_content_snapshots_article_revision_idx
  ON article_content_snapshots (article_id, content_revision DESC);
CREATE INDEX article_content_snapshots_retention_idx
  ON article_content_snapshots (retention_until)
  WHERE purged_at IS NULL AND retention_until IS NOT NULL;

CREATE TABLE casio_flow_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES article_content_snapshots(id) ON DELETE RESTRICT,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL,
  actor_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  flow_key TEXT NOT NULL CHECK (flow_key = 'article_editorial_suggestion'),
  contract_version TEXT NOT NULL DEFAULT 'casio.flow.invoke.v1',
  request_id UUID NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
  casio_run_id TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN (
    'queued', 'dispatched', 'accepted', 'running', 'completed', 'failed', 'cancelled', 'stale'
  )),
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (article_id, snapshot_id, flow_key, contract_version, idempotency_key)
);

CREATE INDEX casio_flow_invocations_article_created_idx
  ON casio_flow_invocations (article_id, created_at DESC);
CREATE INDEX casio_flow_invocations_state_idx
  ON casio_flow_invocations (state, created_at DESC)
  WHERE state IN ('queued', 'dispatched', 'accepted', 'running');

CREATE TABLE integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL CHECK (destination = 'casioplus'),
  event_type TEXT NOT NULL CHECK (event_type = 'casio.flow.invoke.v1'),
  aggregate_type TEXT NOT NULL CHECK (aggregate_type = 'article'),
  aggregate_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  invocation_id UUID NOT NULL REFERENCES casio_flow_invocations(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES article_content_snapshots(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
  payload_schema_version TEXT NOT NULL DEFAULT 'casio.flow.invoke.v1',
  mapping_version TEXT NOT NULL DEFAULT 'kaghazbaad-casio-editorial.v1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'leased', 'delivered', 'dead_letter', 'cancelled'
  )),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_token UUID,
  leased_until TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_outbox_lease_lifecycle CHECK (
    (status = 'leased' AND lease_token IS NOT NULL AND leased_until IS NOT NULL)
    OR (status <> 'leased' AND lease_token IS NULL AND leased_until IS NULL)
  ),
  UNIQUE (destination, idempotency_key)
);

CREATE INDEX integration_outbox_dispatch_idx
  ON integration_outbox (available_at, created_at)
  WHERE status = 'pending';
CREATE INDEX integration_outbox_lease_idx
  ON integration_outbox (leased_until)
  WHERE status = 'leased';
CREATE INDEX integration_outbox_invocation_idx
  ON integration_outbox (invocation_id);

CREATE TABLE casio_callback_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invocation_id UUID NOT NULL REFERENCES casio_flow_invocations(id) ON DELETE CASCADE,
  callback_event_id UUID NOT NULL UNIQUE,
  casio_run_id TEXT NOT NULL,
  request_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 200),
  nonce UUID NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'cancelled')),
  signature_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invocation_id, idempotency_key)
);

CREATE INDEX casio_callback_receipts_invocation_idx
  ON casio_callback_receipts (invocation_id, received_at DESC);

CREATE TABLE article_ai_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES article_content_snapshots(id) ON DELETE RESTRICT,
  invocation_id UUID NOT NULL REFERENCES casio_flow_invocations(id) ON DELETE CASCADE,
  suggestion_index INTEGER NOT NULL CHECK (suggestion_index >= 0),
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('rewrite', 'annotation', 'checklist')),
  anchor JSONB NOT NULL DEFAULT '{}'::jsonb,
  original_text TEXT,
  suggested_text TEXT,
  reason TEXT NOT NULL,
  confidence NUMERIC(4, 3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  state TEXT NOT NULL DEFAULT 'pending_review' CHECK (state IN (
    'pending_review', 'accepted', 'rejected', 'edited', 'stale'
  )),
  flow_key TEXT NOT NULL CHECK (flow_key = 'article_editorial_suggestion'),
  flow_version TEXT NOT NULL,
  casio_run_id TEXT NOT NULL,
  artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  memory_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invocation_id, suggestion_index)
);

CREATE INDEX article_ai_proposals_article_state_idx
  ON article_ai_proposals (article_id, state, created_at DESC);
CREATE INDEX article_ai_proposals_invocation_idx
  ON article_ai_proposals (invocation_id, created_at ASC);
