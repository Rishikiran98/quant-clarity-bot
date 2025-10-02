-- =====================================================================
-- 20251003_security_patch.sql
-- Comprehensive Supabase Security Hardening Migration
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES (PUBLIC_USER_DATA)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Remove all accidental wide grants
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;

-- Owner-only access
DROP POLICY IF EXISTS read_own_profile ON public.profiles;
CREATE POLICY read_own_profile
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS update_own_profile ON public.profiles;
CREATE POLICY update_own_profile
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS insert_own_profile ON public.profiles;
CREATE POLICY insert_own_profile
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin override
DROP POLICY IF EXISTS admin_manage_profiles ON public.profiles;
CREATE POLICY admin_manage_profiles
  ON public.profiles
  FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. API_USAGE (EXPOSED_SENSITIVE_DATA)
-- ---------------------------------------------------------------------
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_usage FROM PUBLIC, anon, authenticated;

-- Grant minimal necessary permissions
GRANT SELECT, INSERT ON public.api_usage TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE api_usage_id_seq TO authenticated;

-- User can only read their own usage
DROP POLICY IF EXISTS read_own_usage ON public.api_usage;
CREATE POLICY read_own_usage
  ON public.api_usage
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS insert_own_usage ON public.api_usage;
CREATE POLICY insert_own_usage
  ON public.api_usage
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admin override
DROP POLICY IF EXISTS admin_read_usage ON public.api_usage;
CREATE POLICY admin_read_usage
  ON public.api_usage
  FOR ALL
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. ANALYTICS VIEWS (MISSING_RLS_PROTECTION)
-- ---------------------------------------------------------------------
-- Revoke public access to sensitive views
REVOKE ALL ON public.v_cost_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_error_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_perf_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_rate_limit_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_system_health FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_user_api_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_user_api_usage_safe FROM PUBLIC, anon, authenticated;

-- Admin-only SECURITY DEFINER wrappers
CREATE OR REPLACE FUNCTION public.admin_v_cost_summary()
RETURNS SETOF public.v_cost_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_cost_summary;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_v_cost_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_v_error_summary()
RETURNS SETOF public.v_error_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_error_summary;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_v_error_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_v_perf_summary()
RETURNS SETOF public.v_perf_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_perf_summary;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_v_perf_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_v_rate_limit_summary()
RETURNS SETOF public.v_rate_limit_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_rate_limit_summary;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_v_rate_limit_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_v_system_health()
RETURNS SETOF public.v_system_health
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.v_system_health;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_v_system_health() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. EXTENSION IN PUBLIC (SUPA_extension_in_public)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- Add security documentation
COMMENT ON TABLE public.profiles IS 'User profile data. RLS enforced: users can only view/edit their own profile. Admins have full access.';
COMMENT ON TABLE public.api_usage IS 'User API usage tracking with IP anonymization. RLS enforced: users can only view their own data, admins can view all.';
COMMENT ON FUNCTION public.admin_v_cost_summary() IS 'Admin-only function to access cost summary analytics. Requires admin role.';