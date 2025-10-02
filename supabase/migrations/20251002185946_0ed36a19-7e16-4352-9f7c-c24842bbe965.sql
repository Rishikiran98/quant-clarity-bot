-- Add explicit policy to deny public/anonymous access to profiles table
-- This makes the security posture explicit and satisfies security scanners

-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;

-- Explicitly deny SELECT access for anonymous/public users
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Also explicitly deny all other operations for anon role
DROP POLICY IF EXISTS "Deny public insert to profiles" ON public.profiles;
CREATE POLICY "Deny public insert to profiles"
ON public.profiles
FOR INSERT
TO anon
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public update to profiles" ON public.profiles;
CREATE POLICY "Deny public update to profiles"
ON public.profiles
FOR UPDATE
TO anon
USING (false);

DROP POLICY IF EXISTS "Deny public delete to profiles" ON public.profiles;
CREATE POLICY "Deny public delete to profiles"
ON public.profiles
FOR DELETE
TO anon
USING (false);