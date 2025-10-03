-- Update the ingest function to include chunk_index
CREATE OR REPLACE FUNCTION public.ingest_document_with_embeddings(p_document_id uuid, p_chunks jsonb, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c jsonb;
  new_chunk_id uuid;
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

    INSERT INTO public.embeddings (document_id, chunk_id, embedding, metadata)
    VALUES (
      p_document_id,
      new_chunk_id,
      (c->'embedding')::vector,
      COALESCE(c->'metadata','{}'::jsonb)
    );
  END LOOP;
END;
$function$;