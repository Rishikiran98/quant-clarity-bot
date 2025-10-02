-- Add explicit RESTRICTIVE policies to block anonymous access
-- This provides defense-in-depth even though table grants are already revoked

-- Add explicit DENY policy for anon role on profiles (RESTRICTIVE)
CREATE POLICY "block_anon_profiles_select"
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "block_anon_profiles_insert"
  ON public.profiles
  AS RESTRICTIVE
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "block_anon_profiles_update"
  ON public.profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "block_anon_profiles_delete"
  ON public.profiles
  AS RESTRICTIVE
  FOR DELETE
  TO anon
  USING (false);

-- Add explicit DENY policy for public role on profiles (RESTRICTIVE)
CREATE POLICY "block_public_profiles_select"
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (false);

CREATE POLICY "block_public_profiles_insert"
  ON public.profiles
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "block_public_profiles_update"
  ON public.profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "block_public_profiles_delete"
  ON public.profiles
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);

-- Verify the policies are in place
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'profiles';
  
  RAISE NOTICE 'Total RLS policies on profiles table: %', policy_count;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'profiles'
    AND policyname LIKE 'block_anon%';
  
  RAISE NOTICE 'Explicit anon DENY policies: %', policy_count;
END $$;

COMMENT ON TABLE public.profiles IS 'User profiles - PII protected with RLS. Authenticated users can only access their own profile. Admins have full access. Anonymous access explicitly blocked via RESTRICTIVE policies.';