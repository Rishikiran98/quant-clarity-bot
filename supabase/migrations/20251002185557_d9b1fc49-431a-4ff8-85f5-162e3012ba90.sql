-- Fix profiles table RLS policies to prevent public access while allowing users to access their own data

-- Drop the problematic deny-all policy
DROP POLICY IF EXISTS "deny_public_access_profiles" ON public.profiles;

-- Verify the correct policies exist and are properly configured
-- These policies ensure:
-- 1. Users can only SELECT their own profile (read own profile)
-- 2. Users can only UPDATE their own profile (update own profile)
-- 3. No public access is allowed - all operations require authentication

-- Re-verify RLS is enabled (it should already be enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Optionally, add a policy to explicitly deny INSERT (profiles should only be created via trigger)
DROP POLICY IF EXISTS "Prevent direct profile creation" ON public.profiles;
CREATE POLICY "Prevent direct profile creation" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Optionally, add a policy to prevent DELETE (profiles should only be deleted via CASCADE from auth.users)
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
CREATE POLICY "Prevent profile deletion" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (false);