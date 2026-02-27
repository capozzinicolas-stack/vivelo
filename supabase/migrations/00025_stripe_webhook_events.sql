-- Stripe webhook event tracking for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,  -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events(processed_at DESC);

-- RLS: Only service role can access this table
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can access (admin client bypasses RLS)
