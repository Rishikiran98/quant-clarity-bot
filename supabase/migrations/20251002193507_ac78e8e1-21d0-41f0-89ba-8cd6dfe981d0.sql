-- Fix security definer view issue
-- Views should use SECURITY INVOKER to enforce permissions of the querying user

DROP VIEW IF EXISTS public.v_user_api_usage;

CREATE VIEW public.v_user_api_usage 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  endpoint,
  ts
FROM public.api_usage
WHERE user_id = auth.uid();

-- Grant access to the sanitized view
GRANT SELECT ON public.v_user_api_usage TO authenticated;