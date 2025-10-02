-- Secure Analytics Views - Admin-Only Access via Security Definer Functions
-- Views don't support RLS directly, so we use security definer functions for access control

-- ============================================================================
-- STEP 1: Completely revoke direct access to analytics views
-- ============================================================================

-- Remove all existing grants
REVOKE ALL ON v_cost_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_error_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_perf_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_rate_limit_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_system_health FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- STEP 2: Create admin-only security definer functions to access views
-- ============================================================================

-- Function to get cost summary (admin only)
CREATE OR REPLACE FUNCTION public.get_cost_summary()
RETURNS TABLE(
  day timestamp with time zone,
  total_queries bigint,
  total_chunks_retrieved bigint,
  llm_cost_usd numeric,
  embedding_cost_usd numeric,
  total_cost_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT day, total_queries, total_chunks_retrieved, llm_cost_usd, embedding_cost_usd, total_cost_usd
  FROM v_cost_summary
  WHERE is_admin();
$$;

-- Function to get error summary (admin only)
CREATE OR REPLACE FUNCTION public.get_error_summary()
RETURNS TABLE(
  minute timestamp with time zone,
  endpoint text,
  error_code text,
  error_count bigint,
  affected_users bigint,
  sample_messages text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT minute, endpoint, error_code, error_count, affected_users, sample_messages
  FROM v_error_summary
  WHERE is_admin();
$$;

-- Function to get performance summary (admin only)
CREATE OR REPLACE FUNCTION public.get_perf_summary()
RETURNS TABLE(
  minute timestamp with time zone,
  endpoint text,
  requests bigint,
  avg_latency integer,
  p50_latency integer,
  p95_latency integer,
  p99_latency integer,
  avg_chunks integer,
  avg_similarity numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT minute, endpoint, requests, avg_latency, p50_latency, p95_latency, p99_latency, avg_chunks, avg_similarity
  FROM v_perf_summary
  WHERE is_admin();
$$;

-- Function to get rate limit summary (admin only)
CREATE OR REPLACE FUNCTION public.get_rate_limit_summary()
RETURNS TABLE(
  minute timestamp with time zone,
  endpoint text,
  total_requests bigint,
  unique_users bigint,
  unique_ips bigint,
  max_user_rpm bigint,
  max_ip_rpm bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT minute, endpoint, total_requests, unique_users, unique_ips, max_user_rpm, max_ip_rpm
  FROM v_rate_limit_summary
  WHERE is_admin();
$$;

-- Function to get system health (admin only)
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS TABLE(
  status text,
  requests_1min bigint,
  requests_5min bigint,
  avg_latency_5min integer,
  errors_5min bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, requests_1min, requests_5min, avg_latency_5min, errors_5min
  FROM v_system_health
  WHERE is_admin();
$$;

-- ============================================================================
-- STEP 3: Grant execute permissions on security definer functions
-- ============================================================================

-- Grant execute to authenticated users (the function itself checks is_admin())
GRANT EXECUTE ON FUNCTION public.get_cost_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perf_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;

-- Revoke from anon and public
REVOKE ALL ON FUNCTION public.get_cost_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_error_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_perf_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_rate_limit_summary() FROM anon, public;
REVOKE ALL ON FUNCTION public.get_system_health() FROM anon, public;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After this migration:
-- 1. Analytics views are completely inaccessible to all users directly
-- 2. Only admin users can access data through security definer functions
-- 3. Functions return empty results for non-admin users (WHERE is_admin() returns false)
-- 4. No business intelligence is exposed to competitors or unauthorized users