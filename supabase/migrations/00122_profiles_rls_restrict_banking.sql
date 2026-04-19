-- Migration: Restrict profiles SELECT to prevent banking data exposure (A7)
--
-- Problem: The existing "Public profiles are viewable by everyone" policy
-- allows any authenticated user (or anonymous visitor) to read ALL columns
-- including sensitive banking data (rfc, clabe, bank_name, bank_document_url).
--
-- Fix: Replace the permissive policy with:
-- 1. Owner can read own profile (all columns)
-- 2. Authenticated users can read public profile info of others (masking banking columns)
-- 3. Anon users can read public profile info (masking banking columns)
--
-- Server-side queries that need full profiles use service-role (bypass RLS).

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Owner can read own profile (all columns including banking)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles (all columns)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- For public/anonymous access to profile info (provider pages, service detail, etc.)
-- we use a secure view that masks banking columns
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id, email, full_name, role, phone, avatar_url,
  company_name, bio, slug, verified,
  max_concurrent_services, apply_buffers_to_all,
  global_buffer_before_minutes, global_buffer_after_minutes,
  banking_status, must_change_password,
  created_at, updated_at,
  -- Banking columns masked: always NULL in the view
  NULL::text AS rfc,
  NULL::text AS clabe,
  NULL::text AS bank_name,
  NULL::text AS bank_document_url
FROM profiles;

-- Grant access on the view to anon and authenticated
GRANT SELECT ON profiles_public TO anon, authenticated;
