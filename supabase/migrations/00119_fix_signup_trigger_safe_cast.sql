-- Fix handle_new_user() trigger — the ::user_role cast from 00118 fails in
-- Supabase Auth context because the function's search_path doesn't include
-- the public schema where user_role enum lives. Use explicit CASE + SET search_path.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE NEW.raw_user_meta_data->>'role'
      WHEN 'provider' THEN 'provider'::public.user_role
      WHEN 'admin' THEN 'admin'::public.user_role
      ELSE 'client'::public.user_role
    END
  );
  RETURN NEW;
END;
$$;
