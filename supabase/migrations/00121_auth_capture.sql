-- 00121_auth_capture.sql
-- Stripe Auth & Capture con Aprobacion del Proveedor (48h)

-- Agregar 'authorized' al enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'authorized' AFTER 'pending';

-- Agregar campos de aceptacion del proveedor a bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS provider_acceptance_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_rejection_reason TEXT;

-- RPC para decrementar campaign usage (idempotente)
CREATE OR REPLACE FUNCTION decrement_campaign_usage(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE id = p_campaign_id AND used_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index para cron de expiracion
CREATE INDEX IF NOT EXISTS idx_bookings_acceptance_deadline
  ON bookings (provider_acceptance_deadline)
  WHERE status = 'pending' AND provider_acceptance_deadline IS NOT NULL;
