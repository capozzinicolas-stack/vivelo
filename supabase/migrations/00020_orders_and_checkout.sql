-- ============================================================
-- Migration 00020: Orders table for checkout flow
-- ============================================================

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'paid', 'partially_fulfilled', 'fulfilled', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Orders table: groups bookings from a single checkout session
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  stripe_payment_intent_id TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  stripe_fee NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add order_id FK to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_order_id ON bookings(order_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Clients can read their own orders
DO $$ BEGIN
  CREATE POLICY "Clients read own orders"
    ON orders FOR SELECT
    USING (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins can read all orders
DO $$ BEGIN
  CREATE POLICY "Admins read all orders"
    ON orders FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- System/authenticated users can insert orders (checkout creates them)
DO $$ BEGIN
  CREATE POLICY "Authenticated users insert orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow updates for webhook status changes (service role handles this)
DO $$ BEGIN
  CREATE POLICY "Admins update orders"
    ON orders FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
