-- Admin access levels for the admin panel.
-- Four levels: super_admin (full), operations (day-to-day), marketing (campaigns), support (read-only).
-- Existing admins default to super_admin. Does NOT touch client/provider code.

-- 1. Create enum
CREATE TYPE admin_level AS ENUM ('super_admin', 'operations', 'marketing', 'support');

-- 2. Add column to profiles (nullable for client/provider, defaults to super_admin for admins)
ALTER TABLE profiles ADD COLUMN admin_level admin_level;

-- 3. Backfill existing admins to super_admin
UPDATE profiles SET admin_level = 'super_admin' WHERE role = 'admin';

-- 4. Update handle_new_user() trigger to set admin_level when role is admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role, admin_level)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE NEW.raw_user_meta_data->>'role'
      WHEN 'provider' THEN 'provider'::public.user_role
      WHEN 'admin' THEN 'admin'::public.user_role
      ELSE 'client'::public.user_role
    END,
    CASE NEW.raw_user_meta_data->>'role'
      WHEN 'admin' THEN 'super_admin'::public.admin_level
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
