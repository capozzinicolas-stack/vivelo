-- Migration 00015: Marketing, Content & Notifications
-- Featured placements, campaigns, notifications, blog posts, featured providers

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE featured_section AS ENUM ('servicios_destacados', 'servicios_recomendados', 'mas_vendidos');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'ended', 'cancelled');
CREATE TYPE notification_type AS ENUM ('featured_placement', 'campaign_enrollment', 'campaign_available', 'system');
CREATE TYPE blog_media_type AS ENUM ('text', 'video', 'audio');
CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');

-- ─── FEATURED PLACEMENTS ────────────────────────────────────

CREATE TABLE featured_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  section featured_section NOT NULL DEFAULT 'servicios_destacados',
  position INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CAMPAIGNS ──────────────────────────────────────────────

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name TEXT NOT NULL,
  external_name TEXT NOT NULL,
  description TEXT,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_reduction_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  vivelo_absorbs_pct NUMERIC(5,2) NOT NULL DEFAULT 100,
  provider_absorbs_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  exposure_channels TEXT[] DEFAULT '{}',
  status campaign_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CAMPAIGN SUBSCRIPTIONS ────────────────────────────────

CREATE TABLE campaign_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, service_id)
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── BLOG POSTS ─────────────────────────────────────────────

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  media_type blog_media_type NOT NULL DEFAULT 'text',
  media_url TEXT,
  status blog_status NOT NULL DEFAULT 'draft',
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FEATURED PROVIDERS ─────────────────────────────────────

CREATE TABLE featured_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ────────────────────────────────────────────────

CREATE INDEX idx_featured_placements_section ON featured_placements(section);
CREATE INDEX idx_featured_placements_dates ON featured_placements(start_date, end_date);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaign_subs_campaign ON campaign_subscriptions(campaign_id);
CREATE INDEX idx_campaign_subs_provider ON campaign_subscriptions(provider_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(recipient_id, read);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_featured_providers_dates ON featured_providers(start_date, end_date);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE featured_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_providers ENABLE ROW LEVEL SECURITY;

-- Admins can manage everything
CREATE POLICY "Admins manage featured_placements" ON featured_placements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage campaigns" ON campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage campaign_subscriptions" ON campaign_subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage notifications" ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage blog_posts" ON blog_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage featured_providers" ON featured_providers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Public read for active featured placements
CREATE POLICY "Public read active featured_placements" ON featured_placements FOR SELECT
  USING (start_date <= now() AND end_date >= now());

-- Public read for active campaigns
CREATE POLICY "Public read active campaigns" ON campaigns FOR SELECT
  USING (status = 'active');

-- Providers can read/manage their own subscriptions
CREATE POLICY "Providers manage own subscriptions" ON campaign_subscriptions FOR ALL
  USING (provider_id = auth.uid());

-- Users read their own notifications
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

-- Public read for published blog posts
CREATE POLICY "Public read published blog_posts" ON blog_posts FOR SELECT
  USING (status = 'published' AND publish_date <= now());

-- Public read for active featured providers
CREATE POLICY "Public read active featured_providers" ON featured_providers FOR SELECT
  USING (start_date <= now() AND end_date >= now());
