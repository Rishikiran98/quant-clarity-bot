-- COMPREHENSIVE SECURITY IMPLEMENTATION FOR PROFILES TABLE
-- Following industry best practices for PII protection

-- Step 1: Enable & Force RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Step 2: Revoke any public/anon grants
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;

-- Step 3: Implement safe RLS policies

-- Drop old restrictive insert policy
DROP POLICY IF EXISTS "Prevent direct profile creation" ON public.profiles;

-- Allow users to select only their own profile
DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
CREATE POLICY "read_own_profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update only their own profile  
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow inserts during signup (id must match auth.uid())
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin override policy (if admin function exists)
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
CREATE POLICY "admin_manage_profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (is_admin());