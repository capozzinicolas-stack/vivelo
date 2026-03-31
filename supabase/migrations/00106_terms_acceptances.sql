-- Terms acceptances: legal audit trail for terms acceptance
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_type TEXT NOT NULL CHECK (terms_type IN ('general', 'provider')),
  terms_version TEXT NOT NULL DEFAULT '1.0',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_type ON terms_acceptances(terms_type);

-- RLS
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can read their own acceptances
CREATE POLICY "Users can read own terms acceptances"
  ON terms_acceptances FOR SELECT
  USING (auth.uid() = user_id);

-- Insert allowed for authenticated users (own records only)
CREATE POLICY "Users can insert own terms acceptances"
  ON terms_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all via service-role (no policy needed, bypasses RLS)
