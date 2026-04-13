-- 00117_whatsapp_v2.sql
-- WhatsApp Fase 2: Event-driven architecture via Mirlo
-- Replaces Phase 1 schema (3 tables + 2 enums → 1 table + 2 enums)

-- ─── Drop Phase 1 ───────────────────────────────────────────────

DROP TABLE IF EXISTS whatsapp_broadcasts CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_template_config CASCADE;
DROP TYPE IF EXISTS whatsapp_trigger_type CASCADE;
DROP TYPE IF EXISTS whatsapp_message_status CASCADE;

-- ─── New Enums ──────────────────────────────────────────────────

CREATE TYPE wa_event_type AS ENUM (
  'provider_welcome',
  'provider_service_approved',
  'provider_service_rejected',
  'provider_service_needs_revision',
  'provider_new_booking',
  'provider_booking_cancelled',
  'provider_event_reminder',
  'provider_start_code',
  'provider_booking_completed',
  'provider_new_review',
  'provider_fiscal_approved',
  'provider_fiscal_rejected',
  'provider_banking_approved',
  'provider_banking_rejected',
  'provider_admin_comment',
  'provider_booking_rejected',
  'client_welcome',
  'client_booking_confirmed',
  'client_booking_cancelled',
  'client_event_reminder',
  'client_verification_codes',
  'client_booking_completed',
  'client_event_started',
  'client_booking_rejected',
  'admin_manual'
);

CREATE TYPE wa_log_status AS ENUM (
  'pending',
  'accepted',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- ─── New Table ──────────────────────────────────────────────────

CREATE TABLE whatsapp_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      wa_event_type NOT NULL,
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone           TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  variables       JSONB DEFAULT '{}',
  mirlo_message_id TEXT,
  status          wa_log_status DEFAULT 'pending',
  error_message   TEXT,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────

CREATE INDEX idx_we_event_type ON whatsapp_events(event_type);
CREATE INDEX idx_we_profile_id ON whatsapp_events(profile_id);
CREATE INDEX idx_we_created_at ON whatsapp_events(created_at DESC);
CREATE INDEX idx_we_booking_id ON whatsapp_events(booking_id);

-- ─── RLS ────────────────────────────────────────────────────────

ALTER TABLE whatsapp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp_events" ON whatsapp_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
