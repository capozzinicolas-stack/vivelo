-- Per-provider commission rate
-- Adds commission_rate to profiles so admins can set individual rates per provider
-- Adds commission_rate_snapshot to bookings to freeze the rate at booking time

-- 1. Add commission_rate to profiles (default 12% = 0.1200)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1200;

-- Constraint: rate must be between 0 and 1 (0% to 100%)
ALTER TABLE profiles
  ADD CONSTRAINT chk_commission_rate_range
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Index for admin queries on providers with commission
CREATE INDEX IF NOT EXISTS idx_profiles_provider_commission
  ON profiles(role, commission_rate)
  WHERE role = 'provider';

-- 2. Add commission_rate_snapshot to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(5,4);

-- 3. Trigger to prevent providers from modifying their own commission_rate
CREATE OR REPLACE FUNCTION fn_protect_commission_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if commission_rate is not being changed
  IF OLD.commission_rate = NEW.commission_rate THEN
    RETURN NEW;
  END IF;

  -- Allow if the update is done by service_role (admin operations)
  -- service_role sets request.jwt.claim.role = 'service_role'
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block if the user is updating their own profile's commission_rate
  IF current_setting('request.jwt.claim.sub', true) = OLD.id::text THEN
    RAISE EXCEPTION 'Providers cannot modify their own commission rate';
  END IF;

  -- Allow admin users to update other profiles
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_commission_rate ON profiles;
CREATE TRIGGER trg_protect_commission_rate
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_commission_rate();

-- 4. Backfill: set commission_rate_snapshot on existing bookings from the constant 0.12
UPDATE bookings
  SET commission_rate_snapshot = 0.1200
  WHERE commission_rate_snapshot IS NULL;
