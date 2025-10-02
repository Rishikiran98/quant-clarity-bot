-- MAXIMUM SECURITY: Remove all anon policies - default deny is more secure
-- When no policy exists for a role, RLS automatically denies all access

-- Remove all explicit anon policies (they're redundant - no policy = no access)
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny public insert to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny public update to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny public delete to profiles" ON public.profiles;

-- Verify: With FORCE RLS and no anon policies, anon role has ZERO access
-- Only authenticated role policies remain (read/update own profile only)

-- Double-check: Ensure no grants exist for anon role
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM PUBLIC;

-- Final verification: Only authenticated users with specific policies can access
-- No policy for anon = automatic deny (PostgreSQL RLS default behavior)