CREATE TYPE service_category AS ENUM ('FOOD_DRINKS', 'AUDIO', 'DECORATION', 'PHOTO_VIDEO', 'STAFF', 'FURNITURE');
CREATE TYPE service_status AS ENUM ('draft', 'active', 'paused', 'archived');

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category service_category NOT NULL,
  status service_status NOT NULL DEFAULT 'draft',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_unit TEXT NOT NULL DEFAULT 'por persona',
  min_guests INTEGER NOT NULL DEFAULT 1,
  max_guests INTEGER NOT NULL DEFAULT 500,
  zones TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_status ON services(status);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
