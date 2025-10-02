-- Create SQL views for metrics dashboards

-- Performance summary view (1-minute buckets)
CREATE OR REPLACE VIEW v_perf_summary AS
SELECT
  date_trunc('minute', ts) as minute,
  endpoint,
  COUNT(*) as requests,
  PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50_latency,
  PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
  PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_latency,
  AVG(latency_ms)::integer as avg_latency,
  AVG(chunks_retrieved)::integer as avg_chunks,
  AVG(avg_similarity) as avg_similarity
FROM public.performance_metrics
WHERE ts > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Error summary view (1-minute buckets)
CREATE OR REPLACE VIEW v_error_summary AS
SELECT
  date_trunc('minute', ts) as minute,
  endpoint,
  error_code,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  ARRAY_AGG(DISTINCT error_message ORDER BY error_message) as sample_messages
FROM public.error_logs
WHERE ts > now() - interval '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- Rate limiting view
CREATE OR REPLACE VIEW v_rate_limit_summary AS
SELECT
  date_trunc('minute', ts) as minute,
  endpoint,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(CASE WHEN user_id IS NOT NULL THEN 
    (SELECT COUNT(*) FROM public.api_usage a2 
     WHERE a2.user_id = api_usage.user_id 
     AND a2.ts BETWEEN api_usage.ts - interval '1 minute' AND api_usage.ts)
  END) as max_user_rpm,
  MAX(CASE WHEN ip_address IS NOT NULL THEN
    (SELECT COUNT(*) FROM public.api_usage a2 
     WHERE a2.ip_address = api_usage.ip_address 
     AND a2.ts BETWEEN api_usage.ts - interval '1 minute' AND api_usage.ts)
  END) as max_ip_rpm
FROM public.api_usage
WHERE ts > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Cost tracking view (estimated)
CREATE OR REPLACE VIEW v_cost_summary AS
SELECT
  date_trunc('day', ts) as day,
  COUNT(*) as total_queries,
  SUM(chunks_retrieved) as total_chunks_retrieved,
  -- Estimated costs (adjust rates as needed)
  (COUNT(*) * 0.0001)::numeric(10,4) as embedding_cost_usd,  -- $0.0001 per query
  (COUNT(*) * 0.002)::numeric(10,4) as llm_cost_usd,          -- $0.002 per completion
  ((COUNT(*) * 0.0001) + (COUNT(*) * 0.002))::numeric(10,4) as total_cost_usd
FROM public.performance_metrics
WHERE ts > now() - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- Health check view (recent 5 minutes)
CREATE OR REPLACE VIEW v_system_health AS
SELECT
  (SELECT COUNT(*) FROM public.performance_metrics WHERE ts > now() - interval '5 minutes') as requests_5min,
  (SELECT AVG(latency_ms)::integer FROM public.performance_metrics WHERE ts > now() - interval '5 minutes') as avg_latency_5min,
  (SELECT COUNT(*) FROM public.error_logs WHERE ts > now() - interval '5 minutes') as errors_5min,
  (SELECT COUNT(*) FROM public.api_usage WHERE ts > now() - interval '1 minute') as requests_1min,
  CASE 
    WHEN (SELECT AVG(latency_ms) FROM public.performance_metrics WHERE ts > now() - interval '5 minutes') > 2000 THEN 'DEGRADED'
    WHEN (SELECT COUNT(*) FROM public.error_logs WHERE ts > now() - interval '5 minutes') > 10 THEN 'DEGRADED'
    ELSE 'HEALTHY'
  END as status;

-- Grant read access to admins
GRANT SELECT ON v_perf_summary TO authenticated;
GRANT SELECT ON v_error_summary TO authenticated;
GRANT SELECT ON v_rate_limit_summary TO authenticated;
GRANT SELECT ON v_cost_summary TO authenticated;
GRANT SELECT ON v_system_health TO authenticated;