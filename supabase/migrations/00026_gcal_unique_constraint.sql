-- Ensure google tracking columns exist on vendor_calendar_blocks
-- (originally added in 00014, but may be missing if that migration was skipped)
ALTER TABLE vendor_calendar_blocks
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Unique constraint for Google Calendar events per vendor
-- Prevents duplicate blocks when syncing the same event
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_calendar_blocks_google_event
  ON vendor_calendar_blocks(vendor_id, google_event_id)
  WHERE google_event_id IS NOT NULL;
