-- Add videos column to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS videos TEXT[] NOT NULL DEFAULT '{}';

-- Create storage bucket for service media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-media',
  'service-media',
  true,
  52428800, -- 50MB max (for videos)
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload service media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view service media (public bucket)
CREATE POLICY "Public can view service media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete own service media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-media' AND (storage.foldername(name))[1] = auth.uid()::text);
