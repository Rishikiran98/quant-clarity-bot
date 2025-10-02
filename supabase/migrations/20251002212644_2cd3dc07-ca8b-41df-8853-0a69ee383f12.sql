-- Comprehensive Security Hardening Migration
-- Addresses: Analytics views RLS, function search paths, and extension isolation

-- ============================================================================
-- 1. ANALYTICS VIEWS PROTECTION
-- ============================================================================
-- Views don't support RLS directly, so we revoke public access and grant only to authenticated/admin

-- Revoke all public access to analytics views
REVOKE ALL ON v_cost_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_error_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_perf_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_rate_limit_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_system_health FROM PUBLIC, anon, authenticated;

-- Grant SELECT only to authenticated users (will be filtered by is_admin() in application layer)
GRANT SELECT ON v_cost_summary TO authenticated;
GRANT SELECT ON v_error_summary TO authenticated;
GRANT SELECT ON v_perf_summary TO authenticated;
GRANT SELECT ON v_rate_limit_summary TO authenticated;
GRANT SELECT ON v_system_health TO authenticated;

-- v_user_api_usage is already properly secured with SECURITY INVOKER in previous migration

-- ============================================================================
-- 2. FUNCTION SEARCH PATH HARDENING
-- ============================================================================
-- Set explicit search_path on all custom functions to prevent manipulation attacks

-- User role functions
ALTER FUNCTION public.has_role(uuid, app_role) 
SET search_path = public;

ALTER FUNCTION public.is_admin() 
SET search_path = public;

-- Document search function
ALTER FUNCTION public.search_documents(vector, integer, uuid) 
SET search_path = public;

-- Document ingestion function
ALTER FUNCTION public.ingest_document_with_embeddings(uuid, jsonb, uuid) 
SET search_path = public;

-- Rate limiting functions
ALTER FUNCTION public.over_limit(uuid, integer) 
SET search_path = public;

ALTER FUNCTION public.over_limit_by_ip(inet, integer) 
SET search_path = public;

-- Trigger functions
ALTER FUNCTION public.handle_new_user() 
SET search_path = public;

ALTER FUNCTION public.handle_updated_at() 
SET search_path = public;

ALTER FUNCTION public.handle_new_user_settings() 
SET search_path = public;

ALTER FUNCTION public.log_profile_access() 
SET search_path = public;

-- ============================================================================
-- 3. EXTENSION ISOLATION
-- ============================================================================
-- Move vector extension to dedicated schema for better security isolation

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure public can still use vector types (needed for queries)
GRANT USAGE ON SCHEMA extensions TO public;

-- Note: Existing code will continue to work because:
-- 1. The vector type is still accessible via the extensions schema
-- 2. PostgreSQL automatically finds the type in the extensions schema
-- 3. Existing tables/columns using vector type are not affected

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================
-- After this migration:
-- 1. Analytics views are only accessible to authenticated users
-- 2. All custom functions have explicit search_path (prevents hijacking)
-- 3. Vector extension is isolated in extensions schema (reduces attack surface)
-- 4. No existing functionality should be broken