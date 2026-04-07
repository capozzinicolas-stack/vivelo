-- Agregar nuevo valor al enum service_status
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'needs_revision';

-- Agregar columna para notas del admin (nullable, no rompe datos existentes)
ALTER TABLE services ADD COLUMN IF NOT EXISTS admin_notes TEXT;
