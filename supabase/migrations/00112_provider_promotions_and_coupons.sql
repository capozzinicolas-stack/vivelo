-- ============================================================
-- Provider Promotions & Coupons
-- Extends campaigns table to support provider-owned promotions
-- with shareable coupon codes. Provider absorbs 100% of the
-- discount; commission rate stays intact.
-- ============================================================

-- 1. Extend campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin'
  CHECK (source IN ('admin','provider'));

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS owner_provider_id UUID
  REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS usage_limit INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER;

-- 2. Consistency constraint: provider campaigns must satisfy invariants
DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT campaigns_provider_consistency
    CHECK (
      source = 'admin'
      OR (
        source = 'provider'
        AND owner_provider_id IS NOT NULL
        AND coupon_code IS NOT NULL
        AND provider_absorbs_pct = 100
        AND vivelo_absorbs_pct = 0
        AND commission_reduction_pct = 0
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Coupon code unique global (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_coupon_code_unique
  ON campaigns(upper(coupon_code)) WHERE coupon_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_provider_id
  ON campaigns(owner_provider_id) WHERE owner_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_source ON campaigns(source);

-- 4. RLS: providers manage their own provider campaigns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers manage own campaigns' AND tablename = 'campaigns') THEN
    CREATE POLICY "Providers manage own campaigns" ON campaigns
      FOR ALL
      USING (source = 'provider' AND owner_provider_id = auth.uid())
      WITH CHECK (source = 'provider' AND owner_provider_id = auth.uid());
  END IF;
END $$;

-- Note: existing policies remain in place:
--   "Admins manage campaigns" FOR ALL (admins can see/modify everything)
--   "Public read active campaigns" FOR SELECT USING (status='active')
--   (public read allows clients to read the campaign when applying a coupon at checkout)

-- 5. Snapshot the coupon code in bookings (auditing / history)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 6. Atomic RPC to increment used_count (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_campaign_usage(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

-- Grant execute to authenticated users (webhooks use service role which bypasses this anyway)
GRANT EXECUTE ON FUNCTION increment_campaign_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_usage(UUID) TO service_role;
