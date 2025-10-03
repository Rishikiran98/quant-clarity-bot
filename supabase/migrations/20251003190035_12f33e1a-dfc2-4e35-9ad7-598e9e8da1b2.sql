-- Fix the vector casting in the ingest function
CREATE OR REPLACE FUNCTION public.ingest_document_with_embeddings(p_document_id uuid, p_chunks jsonb, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  c jsonb;
  new_chunk_id uuid;
  embedding_array float8[];
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(p_chunks)
  LOOP
    INSERT INTO public.document_chunks (id, document_id, chunk_index, page_no, char_start, char_end, text, metadata)
    VALUES (
      gen_random_uuid(),
      p_document_id,
      (c->>'chunk_index')::int,
      (c->>'page_no')::int,
      (c->>'char_start')::int,
      (c->>'char_end')::int,
      c->>'text',
      COALESCE(c->'metadata','{}'::jsonb)
    )
    RETURNING id INTO new_chunk_id;

    -- Convert JSONB array to float8 array, then to vector
    SELECT ARRAY(SELECT jsonb_array_elements_text(c->'embedding')::float8) INTO embedding_array;

    INSERT INTO public.embeddings (document_id, chunk_id, embedding, metadata)
    VALUES (
      p_document_id,
      new_chunk_id,
      embedding_array::extensions.vector,
      COALESCE(c->'metadata','{}'::jsonb)
    );
  END LOOP;
END;
$function$;