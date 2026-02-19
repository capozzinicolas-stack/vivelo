-- Phase 1: Calendar/Availability System + Mexico Migration

-- 1. Add max_concurrent_services to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_concurrent_services INTEGER NOT NULL DEFAULT 1;

-- 2. Add buffer fields to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_before_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_after_days INTEGER NOT NULL DEFAULT 0;

-- 3. Add datetime fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS effective_start TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS effective_end TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_type_snapshot TEXT;

-- 4. Backfill existing bookings
UPDATE bookings
SET
  start_datetime = (event_date || 'T' || start_time || ':00')::TIMESTAMPTZ,
  end_datetime = (event_date || 'T' || end_time || ':00')::TIMESTAMPTZ,
  effective_start = (event_date || 'T' || start_time || ':00')::TIMESTAMPTZ,
  effective_end = (event_date || 'T' || end_time || ':00')::TIMESTAMPTZ,
  billing_type_snapshot = (SELECT s.price_unit FROM services s WHERE s.id = bookings.service_id)
WHERE start_datetime IS NULL;

-- 5. Create vendor_calendar_blocks table
CREATE TABLE vendor_calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vcb_vendor ON vendor_calendar_blocks(vendor_id);
CREATE INDEX idx_vcb_times ON vendor_calendar_blocks(start_datetime, end_datetime);

-- 6. Indexes for availability queries on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_provider_times ON bookings(provider_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_effective_times ON bookings(provider_id, effective_start, effective_end);

-- 7. Availability check function
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

-- 8. RLS policies for vendor_calendar_blocks
ALTER TABLE vendor_calendar_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own blocks"
  ON vendor_calendar_blocks FOR SELECT
  USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert own blocks"
  ON vendor_calendar_blocks FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete own blocks"
  ON vendor_calendar_blocks FOR DELETE
  USING (vendor_id = auth.uid());

CREATE POLICY "Admins can view all blocks"
  ON vendor_calendar_blocks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
