-- ─── Cancellation Policies ──────────────────────────────────────────
-- Dynamic cancellation policies replacing hardcoded CANCELLATION_POLICY constant

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add cancellation_policy_id to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancellation_policy_id UUID REFERENCES cancellation_policies(id);

-- Add default_cancellation_policy_id to profiles (provider default)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_cancellation_policy_id UUID REFERENCES cancellation_policies(id);

-- Add cancellation tracking fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_percent INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

-- ─── Seed: 3 default policies ──────────────────────────────────────

INSERT INTO cancellation_policies (name, description, rules, is_default) VALUES
(
  'Flexible',
  'Politica flexible con reembolso completo hasta 48 horas antes del evento.',
  '[{"min_hours": 48, "max_hours": null, "refund_percent": 100}, {"min_hours": 0, "max_hours": 48, "refund_percent": 50}]'::jsonb,
  true
),
(
  'Moderada',
  'Politica moderada con reembolso parcial segun el tiempo de anticipacion.',
  '[{"min_hours": 168, "max_hours": null, "refund_percent": 100}, {"min_hours": 48, "max_hours": 168, "refund_percent": 50}, {"min_hours": 0, "max_hours": 48, "refund_percent": 0}]'::jsonb,
  true
),
(
  'Estricta',
  'Politica estricta con ventanas de reembolso limitadas.',
  '[{"min_hours": 360, "max_hours": null, "refund_percent": 100}, {"min_hours": 168, "max_hours": 360, "refund_percent": 25}, {"min_hours": 0, "max_hours": 168, "refund_percent": 0}]'::jsonb,
  true
);

-- RLS policies
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read cancellation policies"
  ON cancellation_policies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage cancellation policies"
  ON cancellation_policies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
