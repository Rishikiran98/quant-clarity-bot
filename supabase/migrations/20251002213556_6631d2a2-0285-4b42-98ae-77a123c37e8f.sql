-- Fix remaining security definer view: v_user_api_usage_safe
-- The view was created but security_invoker wasn't properly set

DROP VIEW IF EXISTS public.v_user_api_usage_safe CASCADE;

CREATE VIEW public.v_user_api_usage_safe
WITH (security_invoker = on)
AS
SELECT id, user_id, endpoint, ts
FROM public.api_usage
WHERE user_id = auth.uid();

COMMENT ON VIEW public.v_user_api_usage_safe IS 'User view - shows only current user API usage (no IP addresses) - SECURITY INVOKER enforced';

-- Verify all views now have security_invoker enabled
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v' 
    AND n.nspname = 'public'
    AND c.relname LIKE 'v_%'
    AND COALESCE(
      (SELECT option_value::boolean 
       FROM pg_options_to_table(c.reloptions) 
       WHERE option_name = 'security_invoker'),
      false
    ) = false;
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still have % views without security_invoker enabled', v_count;
  ELSE
    RAISE NOTICE 'All views now have security_invoker enabled - security issue resolved';
  END IF;
END $$;