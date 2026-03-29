-- Blog post links: associate blog posts with services and/or providers
CREATE TABLE IF NOT EXISTS blog_post_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_link_target CHECK (service_id IS NOT NULL OR provider_id IS NOT NULL)
);

-- Index for querying links by blog post
CREATE INDEX idx_blog_post_links_post_id ON blog_post_links (blog_post_id);

-- RLS
ALTER TABLE blog_post_links ENABLE ROW LEVEL SECURITY;

-- Public read access (blog is public)
CREATE POLICY "blog_post_links_read" ON blog_post_links
  FOR SELECT USING (true);

-- Only admins (via service-role) can insert/update/delete
CREATE POLICY "blog_post_links_admin_write" ON blog_post_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
