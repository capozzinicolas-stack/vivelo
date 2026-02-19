-- ============================================================
-- COMBINED: All missing migrations (00008-00011)
-- Run this ONCE in Supabase SQL Editor if you haven't run
-- migrations 00008, 00009, 00010, 00011 before.
-- (00012 was already run)
-- ============================================================

-- === 00008: Videos + Storage ===
ALTER TABLE services ADD COLUMN IF NOT EXISTS videos TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-media',
  'service-media',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Users can upload service media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Public can view service media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-media');

CREATE POLICY IF NOT EXISTS "Users can delete own service media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- === 00009: Booking times ===
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '14:00';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_hours NUMERIC(4,1) NOT NULL DEFAULT 4;

-- === 00010: Hours + deletion ===
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_hours NUMERIC(4,1) NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_hours NUMERIC(4,1) NOT NULL DEFAULT 12;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- === 00011: Phase 1 Calendar + Mexico ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_concurrent_services INTEGER NOT NULL DEFAULT 1;

ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_before_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_after_days INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS effective_start TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS effective_end TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_type_snapshot TEXT;

-- Backfill existing bookings
UPDATE bookings
SET
  start_datetime = (event_date || 'T' || start_time || ':00')::TIMESTAMPTZ,
  end_datetime = (event_date || 'T' || end_time || ':00')::TIMESTAMPTZ,
  effective_start = (event_date || 'T' || start_time || ':00')::TIMESTAMPTZ,
  effective_end = (event_date || 'T' || end_time || ':00')::TIMESTAMPTZ,
  billing_type_snapshot = (SELECT s.price_unit FROM services s WHERE s.id = bookings.service_id)
WHERE start_datetime IS NULL;

-- Vendor calendar blocks table
CREATE TABLE IF NOT EXISTS vendor_calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vcb_vendor ON vendor_calendar_blocks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vcb_times ON vendor_calendar_blocks(start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_times ON bookings(provider_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_effective_times ON bookings(provider_id, effective_start, effective_end);

-- Availability check function
CREATE OR REPLACE FUNCTION check_vendor_availability(
  p_vendor_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  v_max_concurrent INTEGER;
  v_overlapping_count INTEGER;
  v_has_block BOOLEAN;
  v_result JSON;
BEGIN
  SELECT COALESCE(max_concurrent_services, 1) INTO v_max_concurrent
  FROM profiles WHERE id = p_vendor_id;

  SELECT COUNT(*) INTO v_overlapping_count
  FROM bookings
  WHERE provider_id = p_vendor_id
    AND status IN ('pending', 'confirmed')
    AND effective_start < p_end
    AND effective_end > p_start;

  SELECT EXISTS(
    SELECT 1 FROM vendor_calendar_blocks
    WHERE vendor_id = p_vendor_id
      AND start_datetime < p_end
      AND end_datetime > p_start
  ) INTO v_has_block;

  v_result := json_build_object(
    'available', (v_overlapping_count < v_max_concurrent AND NOT v_has_block),
    'overlapping_bookings', v_overlapping_count,
    'max_concurrent', v_max_concurrent,
    'has_calendar_block', v_has_block
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for vendor_calendar_blocks
ALTER TABLE vendor_calendar_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can view own blocks' AND tablename = 'vendor_calendar_blocks') THEN
    CREATE POLICY "Vendors can view own blocks" ON vendor_calendar_blocks FOR SELECT USING (vendor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can insert own blocks' AND tablename = 'vendor_calendar_blocks') THEN
    CREATE POLICY "Vendors can insert own blocks" ON vendor_calendar_blocks FOR INSERT WITH CHECK (vendor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can delete own blocks' AND tablename = 'vendor_calendar_blocks') THEN
    CREATE POLICY "Vendors can delete own blocks" ON vendor_calendar_blocks FOR DELETE USING (vendor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all blocks' AND tablename = 'vendor_calendar_blocks') THEN
    CREATE POLICY "Admins can view all blocks" ON vendor_calendar_blocks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
