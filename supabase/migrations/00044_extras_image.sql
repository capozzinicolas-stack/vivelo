-- ============================================================
-- Migration 00044: Add image column to extras
-- ============================================================
-- Allows providers to upload a photo for each service extra.
-- The description column already exists from migration 00003.

ALTER TABLE extras ADD COLUMN IF NOT EXISTS image TEXT;
