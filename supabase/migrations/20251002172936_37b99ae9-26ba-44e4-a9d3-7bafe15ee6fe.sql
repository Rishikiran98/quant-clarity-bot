-- Add missing ip_address column to api_usage table
ALTER TABLE public.api_usage 
  ADD COLUMN IF NOT EXISTS ip_address inet;

-- Add missing columns to document_chunks for better tracking
ALTER TABLE public.document_chunks 
  ADD COLUMN IF NOT EXISTS page_no integer,
  ADD COLUMN IF NOT EXISTS char_start integer,
  ADD COLUMN IF NOT EXISTS char_end integer;

-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id bigserial PRIMARY KEY,
  error_code text NOT NULL,
  error_message text,
  request_id uuid,
  user_id uuid,
  endpoint text,
  ip_address inet,
  user_agent text,
  ts timestamptz DEFAULT now()
);

-- Create performance_metrics table for observability
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id bigserial PRIMARY KEY,
  endpoint text NOT NULL,
  user_id uuid,
  latency_ms integer NOT NULL,
  chunks_retrieved integer,
  avg_similarity numeric(5,4),
  llm_latency_ms integer,
  db_latency_ms integer,
  ts timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for error_logs (admins only)
CREATE POLICY "error_logs_admin_read" ON public.error_logs
  FOR SELECT USING (is_admin());

-- RLS policies for performance_metrics (admins only)
CREATE POLICY "perf_admin_read" ON public.performance_metrics
  FOR SELECT USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_ts ON public.error_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON public.error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_ts ON public.performance_metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_endpoint ON public.performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_ip ON public.api_usage(ip_address, ts);

-- Rate-limit helper by IP
CREATE OR REPLACE FUNCTION public.over_limit_by_ip(p_ip inet, p_limit int)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COUNT(*) >= p_limit
  FROM public.api_usage
  WHERE ip_address = p_ip AND ts > now() - interval '60 seconds';
$$;

-- Atomic ingest function for documents with embeddings
CREATE OR REPLACE FUNCTION public.ingest_document_with_embeddings(
  p_document_id uuid,
  p_chunks jsonb,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c jsonb;
  new_chunk_id uuid;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(p_chunks)
  LOOP
    INSERT INTO public.document_chunks (id, document_id, page_no, char_start, char_end, text, metadata)
    VALUES (
      gen_random_uuid(),
      p_document_id,
      (c->>'page_no')::int,
      (c->>'char_start')::int,
      (c->>'char_end')::int,
      c->>'text',
      COALESCE(c->'metadata','{}'::jsonb)
    )
    RETURNING id INTO new_chunk_id;

    INSERT INTO public.embeddings (document_id, chunk_id, embedding, metadata)
    VALUES (
      p_document_id,
      new_chunk_id,
      (c->'embedding')::vector,
      COALESCE(c->'metadata','{}'::jsonb)
    );
  END LOOP;
END;
$$;