-- Phase 2: SKUs, Sub-bookings, Extras Dependencies, Global Buffers

-- ============================================================
-- services: add sku + base_event_hours
-- ============================================================
ALTER TABLE services ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_event_hours NUMERIC(4,1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_sku
  ON services (sku) WHERE sku IS NOT NULL;

-- ============================================================
-- extras: add sku + dependency flags
-- ============================================================
ALTER TABLE extras ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE extras ADD COLUMN IF NOT EXISTS depends_on_guests BOOLEAN DEFAULT FALSE;
ALTER TABLE extras ADD COLUMN IF NOT EXISTS depends_on_hours BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_extras_sku
  ON extras (sku) WHERE sku IS NOT NULL;

-- ============================================================
-- profiles: global buffer config
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apply_buffers_to_all BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS global_buffer_before_minutes INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS global_buffer_after_minutes INTEGER DEFAULT 0;

-- ============================================================
-- sub_bookings table
-- ============================================================
CREATE TABLE IF NOT EXISTS sub_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES extras(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  price_type TEXT DEFAULT 'fixed',
  subtotal NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_bookings_booking ON sub_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_sub_bookings_extra ON sub_bookings(extra_id);

-- RLS
ALTER TABLE sub_bookings ENABLE ROW LEVEL SECURITY;

-- Clients can see sub_bookings for their own bookings
CREATE POLICY "sub_bookings_client_select" ON sub_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = sub_bookings.booking_id
        AND bookings.client_id = auth.uid()
    )
  );

-- Providers can see sub_bookings for their bookings
CREATE POLICY "sub_bookings_provider_select" ON sub_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = sub_bookings.booking_id
        AND bookings.provider_id = auth.uid()
    )
  );

-- Admins can see all sub_bookings
CREATE POLICY "sub_bookings_admin_select" ON sub_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Clients can insert sub_bookings for their own bookings
CREATE POLICY "sub_bookings_client_insert" ON sub_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings WHERE bookings.id = sub_bookings.booking_id
        AND bookings.client_id = auth.uid()
    )
  );

-- ============================================================
-- Backfill: migrate existing bookings.selected_extras → sub_bookings
-- ============================================================
INSERT INTO sub_bookings (booking_id, extra_id, name, quantity, unit_price, price_type, subtotal)
SELECT
  b.id AS booking_id,
  (elem->>'extra_id')::UUID AS extra_id,
  COALESCE(elem->>'name', e.name, 'Extra') AS name,
  COALESCE((elem->>'quantity')::INTEGER, 1) AS quantity,
  COALESCE(e.price, (elem->>'price')::NUMERIC, 0) AS unit_price,
  COALESCE(e.price_type, 'fixed') AS price_type,
  COALESCE((elem->>'price')::NUMERIC, 0) AS subtotal
FROM bookings b
CROSS JOIN LATERAL jsonb_array_elements(b.selected_extras) AS elem
LEFT JOIN extras e ON e.id = (elem->>'extra_id')::UUID
WHERE b.selected_extras IS NOT NULL
  AND jsonb_array_length(b.selected_extras) > 0
  AND NOT EXISTS (
    SELECT 1 FROM sub_bookings sb WHERE sb.booking_id = b.id
  );
