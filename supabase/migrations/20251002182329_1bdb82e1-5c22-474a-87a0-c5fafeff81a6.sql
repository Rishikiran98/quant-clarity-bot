-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule health check to run every 5 minutes
SELECT cron.schedule(
  'health-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xfplgwsnvjfbfczdbcft.supabase.co/functions/v1/cron-health-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcGxnd3NudmpmYmZjemRiY2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzMxMDUsImV4cCI6MjA3NDg0OTEwNX0.tEdmp_7LjtFNb0i_OX35WyKM6RsB5IklOxU1G7vt3OM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);