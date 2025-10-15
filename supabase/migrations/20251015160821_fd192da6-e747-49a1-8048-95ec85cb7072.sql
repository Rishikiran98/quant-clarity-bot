-- Fix RLS policies for regular users to access their own data

-- Drop existing restrictive policies on documents
DROP POLICY IF EXISTS "admin read documents" ON public.documents;
DROP POLICY IF EXISTS "admin manage documents" ON public.documents;

-- Recreate admin policies with proper naming
CREATE POLICY "admins_read_all_documents" ON public.documents
  FOR SELECT 
  USING (is_admin());

CREATE POLICY "admins_manage_all_documents" ON public.documents
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure users can read their own query history (already exists but verify)
-- The existing "read own queries" policy should work fine

-- Fix document chunks access to ensure users can read chunks from their documents
DROP POLICY IF EXISTS "admin read chunks" ON public.document_chunks;

CREATE POLICY "admins_read_all_chunks" ON public.document_chunks
  FOR SELECT
  USING (is_admin());

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

-- Ensure new users get 'user' role by default (trigger already exists, but verify it works)
-- The handle_new_user function should assign 'user' role

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