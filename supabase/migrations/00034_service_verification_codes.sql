-- Agregar status 'in_progress' al enum de booking
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'confirmed';

-- Columnas nuevas en bookings para codigos de verificacion
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_code VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_code VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_code_used_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_code_used_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_code_deadline TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN DEFAULT FALSE;
