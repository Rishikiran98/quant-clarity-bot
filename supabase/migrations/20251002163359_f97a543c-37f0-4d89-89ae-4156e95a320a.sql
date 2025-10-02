-- Fix critical RLS security issues by requiring authentication

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own history" ON public.query_history;
DROP POLICY IF EXISTS "Users can view own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create secure RLS policies that require authentication
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view own history"
ON public.query_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own saved queries"
ON public.saved_queries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);