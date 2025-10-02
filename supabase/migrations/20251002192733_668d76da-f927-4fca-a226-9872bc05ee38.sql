-- Add explicit deny policy for anonymous users on profiles table
-- This provides defense-in-depth by explicitly blocking anon access

-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "anon_no_read" ON public.profiles;

-- Block anonymous users completely from reading profiles
CREATE POLICY "anon_no_read"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (false);