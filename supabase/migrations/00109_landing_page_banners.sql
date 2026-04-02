-- Landing page contextual banners (advertising slots for providers)
CREATE TYPE landing_banner_position AS ENUM ('hero', 'mid_feed', 'bottom');

CREATE TABLE landing_page_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Ver mas',
  cta_url TEXT NOT NULL,
  image_url TEXT,
  background_color TEXT DEFAULT '#43276c',
  position landing_banner_position NOT NULL DEFAULT 'hero',
  target_category TEXT REFERENCES service_categories(slug),
  target_zone TEXT REFERENCES service_zones(slug),
  target_event_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  provider_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_landing_banners_active ON landing_page_banners(is_active, position) WHERE is_active = true;
CREATE INDEX idx_landing_banners_category ON landing_page_banners(target_category) WHERE is_active = true;
CREATE INDEX idx_landing_banners_zone ON landing_page_banners(target_zone) WHERE is_active = true;
CREATE INDEX idx_landing_banners_event ON landing_page_banners(target_event_type) WHERE is_active = true;

ALTER TABLE landing_page_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active banners"
  ON landing_page_banners FOR SELECT
  USING (is_active = true);
