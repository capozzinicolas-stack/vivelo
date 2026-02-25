-- Add category_details JSONB column to services
-- Stores category-specific form data (e.g., menu, equipment, materials)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_details JSONB DEFAULT '{}';
