-- ============================================================================
-- COMPREHENSIVE SECURITY HARDENING - Final Production-Ready Version
-- ============================================================================
-- This migration replaces all previous partial security fixes with a complete solution

-- ============================================================================
-- SAFETY PRELUDE: Idempotent helpers
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ============================================================================
-- 1) PII: profiles — block public & scope to owner/admin
-- ============================================================================

-- Enforce RLS on PII table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Remove accidental wide grants
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS read_own_profile ON public.profiles;
DROP POLICY IF EXISTS update_own_profile ON public.profiles;
DROP POLICY IF EXISTS insert_own_profile ON public.profiles;
DROP POLICY IF EXISTS admin_manage_profiles ON public.profiles;
DROP POLICY IF EXISTS authenticated_read_own_profile ON public.profiles;
DROP POLICY IF EXISTS authenticated_update_own_profile ON public.profiles;
DROP POLICY IF EXISTS authenticated_insert_own_profile ON public.profiles;
DROP POLICY IF EXISTS admin_full_access_profiles ON public.profiles;
DROP POLICY IF EXISTS anon_no_access_profiles ON public.profiles;
DROP POLICY IF EXISTS public_no_access_profiles ON public.profiles;

-- Owner-only read/update/insert
CREATE POLICY read_own_profile
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY update_own_profile
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY insert_own_profile
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure is_admin() function exists with correct definition
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public 
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Admin override
CREATE POLICY admin_manage_profiles
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 2) Telemetry: api_usage — block public; user sees own (sanitized), admins see all
-- ============================================================================

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_usage FROM PUBLIC, anon, authenticated;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS read_own_usage ON public.api_usage;
DROP POLICY IF EXISTS admin_read_usage ON public.api_usage;
DROP POLICY IF EXISTS authenticated_read_own_usage ON public.api_usage;
DROP POLICY IF EXISTS authenticated_insert_own_usage ON public.api_usage;
DROP POLICY IF EXISTS admin_full_access_usage ON public.api_usage;
DROP POLICY IF EXISTS anon_no_access_api_usage ON public.api_usage;
DROP POLICY IF EXISTS public_no_access_api_usage ON public.api_usage;

-- User can read and insert their own rows
CREATE POLICY read_own_usage
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY insert_own_usage
  ON public.api_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read everything
CREATE POLICY admin_read_usage
  ON public.api_usage
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Sanitized view for users (no IP address exposure)
CREATE OR REPLACE VIEW public.v_user_api_usage_safe AS
SELECT id, user_id, endpoint, ts
FROM public.api_usage
WHERE user_id = auth.uid();

-- ============================================================================
-- 3) Analytics views — admin-only via RPC wrappers
-- ============================================================================

-- Remove any existing grants on the views
REVOKE ALL ON public.v_cost_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_error_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_perf_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_rate_limit_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_system_health FROM PUBLIC, anon, authenticated;

-- Admin-only SECURITY DEFINER RPCs with proper error handling
CREATE OR REPLACE FUNCTION public.admin_v_cost_summary()
RETURNS SETOF public.v_cost_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_cost_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_v_error_summary()
RETURNS SETOF public.v_error_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_error_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_v_perf_summary()
RETURNS SETOF public.v_perf_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_perf_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_v_rate_limit_summary()
RETURNS SETOF public.v_rate_limit_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_rate_limit_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_v_system_health()
RETURNS SETOF public.v_system_health
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_system_health;
END;
$$;

-- Grant execute to authenticated users (function enforces admin check)
GRANT EXECUTE ON FUNCTION public.admin_v_cost_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_v_error_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_v_perf_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_v_rate_limit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_v_system_health() TO authenticated;

-- ============================================================================
-- 4) Function search_path hardening
-- ============================================================================

ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.search_documents(vector, integer, uuid) SET search_path = public;
ALTER FUNCTION public.ingest_document_with_embeddings(uuid, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.over_limit(uuid, integer) SET search_path = public;
ALTER FUNCTION public.over_limit_by_ip(inet, integer) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user_settings() SET search_path = public;
ALTER FUNCTION public.log_profile_access() SET search_path = public;
ALTER FUNCTION public.admin_v_cost_summary() SET search_path = public;
ALTER FUNCTION public.admin_v_error_summary() SET search_path = public;
ALTER FUNCTION public.admin_v_perf_summary() SET search_path = public;
ALTER FUNCTION public.admin_v_rate_limit_summary() SET search_path = public;
ALTER FUNCTION public.admin_v_system_health() SET search_path = public;

-- ============================================================================
-- 5) Extension isolation
-- ============================================================================

-- Ensure extensions schema exists and move vector extension
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure app roles can resolve vector types/operators
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
-- After this migration:
-- 1. profiles: Only owner can read/update/insert their own; admins can manage all
-- 2. api_usage: Users can only see/insert their own data; admins see all
-- 3. Analytics views: Completely blocked; only accessible via admin_* RPC functions
-- 4. All functions have explicit search_path to prevent manipulation
-- 5. Vector extension isolated in extensions schema
-- 6. Zero public/anon access to sensitive data