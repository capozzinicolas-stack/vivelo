-- Add min/max hours for per-hour services
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_hours NUMERIC(4,1) NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_hours NUMERIC(4,1) NOT NULL DEFAULT 12;

-- Add deletion request tracking
ALTER TABLE services ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
