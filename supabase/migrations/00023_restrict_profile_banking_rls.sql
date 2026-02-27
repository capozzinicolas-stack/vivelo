-- Migration: Tighten profile access policies
-- Replace the wide-open "Public profiles are viewable by everyone"
-- with an authenticated-only policy. Column-level restrictions
-- are enforced at the application layer via explicit SELECT lists.

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Only authenticated users can view profiles
-- (sensitive banking columns are excluded in app-layer queries)
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
