-- Lock down api_usage table to prevent IP tracking and activity pattern analysis
-- Force RLS on api_usage table
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage FORCE ROW LEVEL SECURITY;

-- Revoke all existing grants that could bypass RLS
REVOKE ALL ON public.api_usage FROM PUBLIC, anon, authenticated;

-- Grant minimal necessary permissions to authenticated users
-- Users can only insert their own usage data (via edge functions)
-- Reading is controlled by RLS policies (own data only)
GRANT SELECT, INSERT ON public.api_usage TO authenticated;

-- Ensure the sequence is accessible for inserts
GRANT USAGE, SELECT ON SEQUENCE api_usage_id_seq TO authenticated;

-- Add comment documenting the security measures
COMMENT ON TABLE public.api_usage IS 'User API usage tracking with IP anonymization. RLS enforced: users can only view their own data, admins can view all. IP addresses should be anonymized before storage (handled in edge functions).';