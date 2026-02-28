-- Campaign checkout integration: link bookings to campaigns and track discounts

-- Add campaign/discount fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0;

-- Add discount tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_total NUMERIC(10,2);

-- Index for querying bookings by campaign
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON bookings(campaign_id) WHERE campaign_id IS NOT NULL;
