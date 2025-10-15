-- Fix RLS policies for regular users to access their own data

-- Add index on user_id for better performance on user_roles lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Create a helper function to check if a user is a regular user (not admin)
CREATE OR REPLACE FUNCTION public.is_regular_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'user'
  ) AND NOT is_admin();
$$;

-- Add a function to get user role for easy access
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;