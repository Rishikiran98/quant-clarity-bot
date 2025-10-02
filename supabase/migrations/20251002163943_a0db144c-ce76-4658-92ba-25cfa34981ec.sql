-- Phase 1 & 2: Comprehensive Security Hardening + Core Functionality

-- ============================================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. CREATE DOCUMENT_CHUNKS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

-- ============================================================================
-- 3. CREATE EMBEDDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.embeddings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create IVFFlat index for fast similarity search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- 4. CREATE API_USAGE TABLE FOR RATE LIMITING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_user_ts_idx ON public.api_usage(user_id, ts);

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- is_admin() function for role-based access
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- over_limit() function for rate limiting
CREATE OR REPLACE FUNCTION public.over_limit(p_user UUID, p_limit INTEGER)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) >= p_limit
  FROM public.api_usage
  WHERE user_id = p_user AND ts > now() - interval '60 seconds';
$$;

-- ============================================================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. DROP OLD POLICIES AND CREATE SECURE RLS POLICIES
-- ============================================================================

-- PROFILES: 1:1 with auth.users
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- QUERY_HISTORY
DROP POLICY IF EXISTS "Authenticated users can view own history" ON public.query_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.query_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.query_history;

CREATE POLICY "read own queries"
ON public.query_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert own queries"
ON public.query_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete own queries"
ON public.query_history FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- SAVED_QUERIES
DROP POLICY IF EXISTS "Authenticated users can view own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can delete own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can insert own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can update own saved queries" ON public.saved_queries;

CREATE POLICY "read own saved queries"
ON public.saved_queries FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert/update own saved queries"
ON public.saved_queries FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- USER_SETTINGS
DROP POLICY IF EXISTS "Authenticated users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

CREATE POLICY "read/update own settings"
ON public.user_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- USER_ROLES
DROP POLICY IF EXISTS "Authenticated users can view own roles" ON public.user_roles;

CREATE POLICY "read own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admin manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DOCUMENTS: Add owner_id if not exists, update policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'owner_id') THEN
    ALTER TABLE public.documents ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    UPDATE public.documents SET owner_id = uploaded_by WHERE owner_id IS NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;

CREATE POLICY "read own docs"
ON public.documents FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "insert own docs"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update own docs"
ON public.documents FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "delete own docs"
ON public.documents FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "admin read documents"
ON public.documents FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admin manage documents"
ON public.documents FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DOCUMENT_CHUNKS: Inherit ownership from documents
CREATE POLICY "read chunks via owned docs"
ON public.document_chunks FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_chunks.document_id
    AND d.owner_id = auth.uid()
));

CREATE POLICY "insert chunks via owned docs"
ON public.document_chunks FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_chunks.document_id
    AND d.owner_id = auth.uid()
));

CREATE POLICY "admin read chunks"
ON public.document_chunks FOR SELECT
TO authenticated
USING (public.is_admin());

-- EMBEDDINGS: Inherit ownership from documents
CREATE POLICY "read embeddings via owned docs"
ON public.embeddings FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = embeddings.document_id
    AND d.owner_id = auth.uid()
));

CREATE POLICY "insert embeddings via owned docs"
ON public.embeddings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = embeddings.document_id
    AND d.owner_id = auth.uid()
));

CREATE POLICY "admin read embeddings"
ON public.embeddings FOR SELECT
TO authenticated
USING (public.is_admin());

-- API_USAGE: Users can read their own usage
CREATE POLICY "read own api usage"
ON public.api_usage FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert own api usage"
ON public.api_usage FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. CREATE VECTOR SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  similarity FLOAT,
  chunk_text TEXT,
  chunk_metadata JSONB,
  doc_title TEXT,
  doc_source TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    dc.id AS chunk_id,
    d.id AS document_id,
    1 - (e.embedding <=> query_embedding) AS similarity,
    dc.text AS chunk_text,
    dc.metadata AS chunk_metadata,
    d.title AS doc_title,
    d.source AS doc_source
  FROM public.embeddings e
  JOIN public.document_chunks dc ON dc.id = e.chunk_id
  JOIN public.documents d ON d.id = e.document_id
  WHERE d.owner_id = p_user_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;