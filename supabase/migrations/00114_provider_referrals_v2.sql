-- Provider Referrals V2
-- Scope: V1 manual tracking + automatic tier calculation of benefits
-- Extends existing referral_codes / referral_rewards (from 00033)
-- Adds new table provider_referral_benefits for tier-based benefits
-- Adds early_adopter_ends_at to profiles for Early Adopter rule

-- =============================================================================
-- 0. Clean existing test data
-- =============================================================================
DELETE FROM referral_rewards;

-- =============================================================================
-- 1. Extend referral_rewards with activation tracking
-- =============================================================================

-- Drop default so we can migrate the status column semantics
ALTER TABLE referral_rewards ALTER COLUMN status DROP DEFAULT;

-- Translate legacy statuses (best-effort: any row lingering at this point,
-- should be none because of DELETE above)
UPDATE referral_rewards SET status = 'pending_signup' WHERE status = 'pending';
UPDATE referral_rewards SET status = 'active_sale' WHERE status = 'credited';
UPDATE referral_rewards SET status = 'expired' WHERE status NOT IN ('pending_signup','active_sale','expired','revoked');

ALTER TABLE referral_rewards ALTER COLUMN status SET DEFAULT 'pending_signup';

ALTER TABLE referral_rewards
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- =============================================================================
-- 2. Extend profiles with Early Adopter end date (manual flag from admin)
-- =============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS early_adopter_ends_at TIMESTAMPTZ;

-- =============================================================================
-- 3. New table: provider_referral_benefits
-- Tracks tier-based benefits (3 sales 50% off / 3 sales 75% off / 3 months priority)
-- generated automatically based on activated referral count
-- =============================================================================
CREATE TABLE IF NOT EXISTS provider_referral_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN (
    'commission_50_off',
    'commission_75_off',
    'priority_placement_3m'
  )),
  tier_level SMALLINT NOT NULL CHECK (tier_level IN (1, 2, 3)),
  triggered_by_referral_count INTEGER NOT NULL CHECK (triggered_by_referral_count >= 1),
  total_sales_granted INTEGER NOT NULL CHECK (total_sales_granted >= 0),
  sales_consumed INTEGER NOT NULL DEFAULT 0 CHECK (sales_consumed >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'active',
    'consumed',
    'expired'
  )),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prb_provider_id ON provider_referral_benefits(provider_id);
CREATE INDEX IF NOT EXISTS idx_prb_status ON provider_referral_benefits(status);
CREATE INDEX IF NOT EXISTS idx_prb_tier_level ON provider_referral_benefits(tier_level);

-- Unique constraint: one benefit row per (provider, tier_level, triggered_by_referral_count)
-- ensures idempotent generation (same count can't spawn duplicate benefits)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prb_dedupe
  ON provider_referral_benefits(provider_id, benefit_type, triggered_by_referral_count);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_provider_referral_benefits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prb_updated_at ON provider_referral_benefits;
CREATE TRIGGER trigger_prb_updated_at
  BEFORE UPDATE ON provider_referral_benefits
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_referral_benefits_updated_at();

-- =============================================================================
-- 4. RLS for provider_referral_benefits
-- =============================================================================
ALTER TABLE provider_referral_benefits ENABLE ROW LEVEL SECURITY;

-- Provider can read own benefits
CREATE POLICY "Provider read own benefits" ON provider_referral_benefits
  FOR SELECT
  USING (provider_id = auth.uid());

-- Admin can read/manage all
CREATE POLICY "Admin manage all benefits" ON provider_referral_benefits
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- 5. RLS extension for referral_rewards: admin full manage
-- (existing policies already cover SELECT + INSERT; add admin UPDATE/DELETE)
-- =============================================================================
DROP POLICY IF EXISTS "Admin manage referral rewards" ON referral_rewards;
CREATE POLICY "Admin manage referral rewards" ON referral_rewards
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin full manage referral_codes (to allow manual assignment via admin UI)
DROP POLICY IF EXISTS "Admin manage referral codes" ON referral_codes;
CREATE POLICY "Admin manage referral codes" ON referral_codes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
