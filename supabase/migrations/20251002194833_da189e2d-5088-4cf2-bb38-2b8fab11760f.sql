-- Add explicit restrictive policies to block anonymous access to profiles and api_usage tables
-- This is a defense-in-depth measure to ensure no public access is possible

-- Block anonymous access to profiles table
CREATE POLICY "anon_no_access_profiles"
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);

-- Block anonymous access to api_usage table  
CREATE POLICY "anon_no_access_api_usage"
  ON public.api_usage
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);

-- Also block public role access (extra safety)
CREATE POLICY "public_no_access_profiles"
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (false);

CREATE POLICY "public_no_access_api_usage"
  ON public.api_usage
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (false);