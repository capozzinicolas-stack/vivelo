-- Marketing analytics: event tracking and UTM attribution

CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,           -- 'impression' | 'click'
  placement_type TEXT NOT NULL,       -- 'featured_placement' | 'campaign' | 'banner' | 'showcase' | 'featured_provider'
  placement_id UUID NOT NULL,
  service_id UUID REFERENCES services(id),
  user_id UUID REFERENCES profiles(id),
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_type ON marketing_events(event_type, placement_type);
CREATE INDEX IF NOT EXISTS idx_marketing_events_placement ON marketing_events(placement_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_created ON marketing_events(created_at);

-- UTM attribution tracking
CREATE TABLE IF NOT EXISTS utm_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  landing_page TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utm_attribution_user ON utm_attribution(user_id);
CREATE INDEX IF NOT EXISTS idx_utm_attribution_created ON utm_attribution(created_at);

-- RLS policies
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_attribution ENABLE ROW LEVEL SECURITY;

-- Anyone can insert marketing events (for anonymous tracking)
CREATE POLICY "Allow insert marketing events" ON marketing_events FOR INSERT WITH CHECK (true);
-- Only admins can read marketing events
CREATE POLICY "Admin read marketing events" ON marketing_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Users can insert their own UTM attribution
CREATE POLICY "Allow insert own utm" ON utm_attribution FOR INSERT WITH CHECK (user_id = auth.uid());
-- Users can read their own, admins can read all
CREATE POLICY "Read own utm" ON utm_attribution FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to increment service view count
CREATE OR REPLACE FUNCTION increment_view_count(p_service_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE services SET view_count = view_count + 1 WHERE id = p_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
