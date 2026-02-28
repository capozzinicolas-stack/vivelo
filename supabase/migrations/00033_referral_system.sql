-- Referral system: codes and rewards tracking

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  referred_id UUID NOT NULL REFERENCES profiles(id),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  order_id UUID REFERENCES orders(id),
  reward_type TEXT DEFAULT 'discount',  -- 'discount' | 'cashback' | 'credit'
  reward_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'credited' | 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read/create their own codes
CREATE POLICY "Own referral codes" ON referral_codes FOR ALL USING (user_id = auth.uid());
-- Admin can read all codes
CREATE POLICY "Admin read referral codes" ON referral_codes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can read their own rewards
CREATE POLICY "Own referral rewards" ON referral_rewards FOR SELECT USING (
  referrer_id = auth.uid() OR referred_id = auth.uid()
);
-- System can insert rewards (service role)
CREATE POLICY "Insert referral rewards" ON referral_rewards FOR INSERT WITH CHECK (true);
-- Admin can read all
CREATE POLICY "Admin read referral rewards" ON referral_rewards FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
