-- Blog SEO fields: enhanced metadata for blog posts

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES profiles(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image TEXT;
