-- 023_billing_and_quota_indexes.sql
-- Optimizes indexing for billing invoices, subscription life-cycle, usage telemetry, and quota reservations.

CREATE INDEX IF NOT EXISTS invoices_due_status_idx
  ON invoices(status, due_at) WHERE status = 'issued';

CREATE INDEX IF NOT EXISTS subscriptions_cancel_expiry_idx
  ON subscriptions(status, cancel_at_period_end, current_period_end)
  WHERE cancel_at_period_end = TRUE;

CREATE INDEX IF NOT EXISTS usage_events_user_feature_idx
  ON usage_events(user_id, feature_key, created_at DESC);

CREATE INDEX IF NOT EXISTS quota_reservations_user_state_idx
  ON quota_reservations(user_id, state, created_at DESC);
