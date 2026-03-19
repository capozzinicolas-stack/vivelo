ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'pending_review' AFTER 'draft';

-- Allow admins to view services in any status (pending_review, draft, etc.)
DROP POLICY IF EXISTS "Active services are viewable by everyone" ON services;
CREATE POLICY "Active services are viewable by everyone" ON services
FOR SELECT USING (
  status = 'active'
  OR provider_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow admins to update any service (approve/reject)
DROP POLICY IF EXISTS "Providers can update own services" ON services;
CREATE POLICY "Providers and admins can update services" ON services
FOR UPDATE USING (
  provider_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
