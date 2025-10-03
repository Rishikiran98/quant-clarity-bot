-- Fix vector operator issue in search_documents function
-- The search_path needs to include 'extensions' schema for vector operators to work

CREATE OR REPLACE FUNCTION public.search_documents(
  query_embedding extensions.vector, 
  match_count integer DEFAULT 5, 
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  chunk_id uuid, 
  document_id uuid, 
  similarity double precision, 
  chunk_text text, 
  chunk_metadata jsonb, 
  doc_title text, 
  doc_source text
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
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