-- Add image_url column to service_categories for category showcase images
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS image_url TEXT;
