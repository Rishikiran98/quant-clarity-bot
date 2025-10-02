-- ============================================================
-- COMPREHENSIVE SECURITY FIX FOR PROFILES AND API_USAGE TABLES
-- Addresses privilege escalation and data exposure vulnerabilities
-- ============================================================

-- ========== PROFILES TABLE SECURITY ==========

-- Step 1: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "anon_no_read" ON public.profiles;

-- Step 2: Force RLS and revoke all public/anon access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

-- Step 3: Grant minimal required permissions to authenticated role
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- Step 4: Create explicit safe policies for authenticated users only
CREATE POLICY "authenticated_read_own_profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "authenticated_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "authenticated_insert_own_profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 5: Admin override (if is_admin function exists)
CREATE POLICY "admin_full_access_profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (is_admin());

-- ========== API_USAGE TABLE SECURITY ==========

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "read own api usage" ON public.api_usage;
DROP POLICY IF EXISTS "insert own api usage" ON public.api_usage;

-- Step 2: Force RLS and revoke all public/anon access
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage FROM PUBLIC;
REVOKE ALL ON public.api_usage FROM anon;
REVOKE ALL ON public.api_usage FROM authenticated;

-- Step 3: Grant minimal permissions
GRANT SELECT, INSERT ON public.api_usage TO authenticated;

-- Step 4: Users can only see their own usage (with sanitized data via view below)
CREATE POLICY "authenticated_read_own_usage"
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_insert_own_usage"
  ON public.api_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Step 5: Admin full access
CREATE POLICY "admin_full_access_usage"
  ON public.api_usage
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Step 6: Create sanitized view for user consumption (hides IP addresses)
DROP VIEW IF EXISTS public.v_user_api_usage;
CREATE VIEW public.v_user_api_usage AS
SELECT 
  id,
  user_id,
  endpoint,
  ts
FROM public.api_usage
WHERE user_id = auth.uid();

-- Grant access to the sanitized view
GRANT SELECT ON public.v_user_api_usage TO authenticated;

-- ========== VERIFICATION ==========
-- Anon should have zero effective permissions on both tables
-- Authenticated users can only access their own records
-- Admins can access everything