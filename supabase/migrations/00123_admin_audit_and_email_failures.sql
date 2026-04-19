-- Admin audit log for tracking admin actions (M8)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,         -- 'user', 'service', 'fiscal', 'review', etc.
  target_id TEXT,           -- UUID or identifier of the target
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log (action);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log, inserts via service-role
CREATE POLICY "Admins can read audit log"
  ON admin_audit_log FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Failed emails log for visibility (A3)
CREATE TABLE IF NOT EXISTS failed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  error_message TEXT,
  error_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_emails_created ON failed_emails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_emails_type ON failed_emails (email_type);

ALTER TABLE failed_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can read failed emails
CREATE POLICY "Admins can read failed emails"
  ON failed_emails FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
