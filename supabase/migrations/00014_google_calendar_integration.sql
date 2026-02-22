-- Google Calendar integration for providers
-- Stores OAuth tokens (encrypted) and sync state

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  vivelo_calendar_id TEXT,
  google_email TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'disconnected')),
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_provider_google UNIQUE (provider_id)
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own connection"
  ON google_calendar_connections FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can manage own connection"
  ON google_calendar_connections FOR ALL
  USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all connections"
  ON google_calendar_connections FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add google tracking columns to vendor_calendar_blocks
ALTER TABLE vendor_calendar_blocks
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Add google calendar event id to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
