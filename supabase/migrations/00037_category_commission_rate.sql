-- Migration: Add commission_rate to service_categories
-- Moves commission from per-provider (profiles.commission_rate) to per-category (service_categories.commission_rate)

ALTER TABLE service_categories
ADD COLUMN commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1200;

ALTER TABLE service_categories
ADD CONSTRAINT service_categories_commission_rate_check
CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Mark the old per-provider column as deprecated (keep for historical reference)
COMMENT ON COLUMN profiles.commission_rate IS 'DEPRECATED: Commission is now managed per-category via service_categories.commission_rate. This column is kept for historical reference only.';
