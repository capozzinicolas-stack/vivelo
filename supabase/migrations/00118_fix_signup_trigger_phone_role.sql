-- Fix handle_new_user() trigger to copy phone and role from auth metadata.
-- Previously only id, email, full_name were copied — phone and role were lost.
-- This is a known HIGH severity bug documented in CLAUDE.md.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'client'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: copy phone and role from auth.users metadata to profiles
-- for any existing users where profiles.phone IS NULL but metadata has it.
UPDATE profiles p
SET
  phone = COALESCE(p.phone, u.raw_user_meta_data->>'phone'),
  role = COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', '')::user_role,
    p.role
  )
FROM auth.users u
WHERE p.id = u.id
  AND (
    (p.phone IS NULL AND u.raw_user_meta_data->>'phone' IS NOT NULL)
    OR
    (p.role = 'client' AND u.raw_user_meta_data->>'role' = 'provider')
  );
