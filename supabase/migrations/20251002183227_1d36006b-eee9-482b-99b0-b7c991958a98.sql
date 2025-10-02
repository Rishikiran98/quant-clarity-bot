-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
-- This ensures views respect the RLS policies of the querying user

-- Drop existing views
DROP VIEW IF EXISTS public.v_cost_summary;
DROP VIEW IF EXISTS public.v_error_summary;
DROP VIEW IF EXISTS public.v_perf_summary;
DROP VIEW IF EXISTS public.v_rate_limit_summary;
DROP VIEW IF EXISTS public.v_system_health;

-- Recreate v_cost_summary with SECURITY INVOKER
CREATE VIEW public.v_cost_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('day', ts) AS day,
  COUNT(*) AS total_queries,
  SUM(chunks_retrieved) AS total_chunks_retrieved,
  (COUNT(*) * 0.0001)::numeric(10,4) AS embedding_cost_usd,
  (COUNT(*) * 0.002)::numeric(10,4) AS llm_cost_usd,
  (COUNT(*) * 0.0001 + COUNT(*) * 0.002)::numeric(10,4) AS total_cost_usd
FROM performance_metrics
WHERE ts > NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', ts)
ORDER BY day DESC;

-- Recreate v_error_summary with SECURITY INVOKER
CREATE VIEW public.v_error_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('minute', ts) AS minute,
  endpoint,
  error_code,
  COUNT(*) AS error_count,
  COUNT(DISTINCT user_id) AS affected_users,
  array_agg(DISTINCT error_message ORDER BY error_message) AS sample_messages
FROM error_logs
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('minute', ts), endpoint, error_code
ORDER BY minute DESC, endpoint, error_code;

-- Recreate v_perf_summary with SECURITY INVOKER
CREATE VIEW public.v_perf_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('minute', ts) AS minute,
  endpoint,
  COUNT(*) AS requests,
  PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_latency,
  PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency,
  PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_latency,
  AVG(latency_ms)::integer AS avg_latency,
  AVG(chunks_retrieved)::integer AS avg_chunks,
  AVG(avg_similarity) AS avg_similarity
FROM performance_metrics
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('minute', ts), endpoint
ORDER BY minute DESC, endpoint;

-- Recreate v_rate_limit_summary with SECURITY INVOKER
CREATE VIEW public.v_rate_limit_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('minute', ts) AS minute,
  endpoint,
  COUNT(*) AS total_requests,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT ip_address) AS unique_ips,
  MAX(CASE 
    WHEN user_id IS NOT NULL THEN (
      SELECT COUNT(*) FROM api_usage a2 
      WHERE a2.user_id = api_usage.user_id 
        AND a2.ts >= api_usage.ts - INTERVAL '1 minute' 
        AND a2.ts <= api_usage.ts
    )
    ELSE NULL 
  END) AS max_user_rpm,
  MAX(CASE 
    WHEN ip_address IS NOT NULL THEN (
      SELECT COUNT(*) FROM api_usage a2 
      WHERE a2.ip_address = api_usage.ip_address 
        AND a2.ts >= api_usage.ts - INTERVAL '1 minute' 
        AND a2.ts <= api_usage.ts
    )
    ELSE NULL 
  END) AS max_ip_rpm
FROM api_usage
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('minute', ts), endpoint
ORDER BY minute DESC, endpoint;

-- Recreate v_system_health with SECURITY INVOKER
CREATE VIEW public.v_system_health
WITH (security_invoker = true)
AS
SELECT 
  (SELECT COUNT(*) FROM performance_metrics WHERE ts > NOW() - INTERVAL '5 minutes') AS requests_5min,
  (SELECT AVG(latency_ms)::integer FROM performance_metrics WHERE ts > NOW() - INTERVAL '5 minutes') AS avg_latency_5min,
  (SELECT COUNT(*) FROM error_logs WHERE ts > NOW() - INTERVAL '5 minutes') AS errors_5min,
  (SELECT COUNT(*) FROM api_usage WHERE ts > NOW() - INTERVAL '1 minute') AS requests_1min,
  CASE 
    WHEN (SELECT AVG(latency_ms) FROM performance_metrics WHERE ts > NOW() - INTERVAL '5 minutes') > 2000 THEN 'DEGRADED'
    WHEN (SELECT COUNT(*) FROM error_logs WHERE ts > NOW() - INTERVAL '5 minutes') > 10 THEN 'DEGRADED'
    ELSE 'HEALTHY'
  END AS status;