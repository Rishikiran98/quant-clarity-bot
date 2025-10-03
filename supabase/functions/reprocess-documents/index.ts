import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's token to verify auth
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Reprocessing documents for user:', user.id);

    // Create service role client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all documents without embeddings
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('owner_id', user.id);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No documents to reprocess',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which documents don't have embeddings
    const documentsWithoutEmbeddings = [];
    for (const doc of documents) {
      const { data: embeddings } = await supabase
        .from('embeddings')
        .select('id')
        .eq('document_id', doc.id)
        .limit(1);

      if (!embeddings || embeddings.length === 0) {
        documentsWithoutEmbeddings.push(doc);
      }
    }

    console.log(`Found ${documentsWithoutEmbeddings.length} documents without embeddings`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Import chunking function
    const chunkText = (text: string, size = 1000, overlap = 200): string[] => {
      const chunks: string[] = [];
      let i = 0;
      while (i < text.length) {
        const end = Math.min(i + size, text.length);
        const chunk = text.slice(i, end).trim();
        if (chunk.length > 0) chunks.push(chunk);
        i += size - overlap;
      }
      return chunks;
    };

    // Process each document
    const results = [];
    for (const doc of documentsWithoutEmbeddings) {
      console.log(`Processing document: ${doc.title}`);
      
      try {
        // Get the full document with content
        const { data: fullDoc, error: docError } = await supabase
          .from('documents')
          .select('content')
          .eq('id', doc.id)
          .single();

        if (docError || !fullDoc?.content) {
          results.push({ id: doc.id, title: doc.title, status: 'failed', error: 'No content found' });
          continue;
        }

        // Chunk the text
        const chunks = chunkText(fullDoc.content);
        console.log(`Created ${chunks.length} chunks for ${doc.title}`);

        // Generate embeddings in batches
        const batchSize = 10;
        const chunksWithEmbeddings: any[] = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: batch,
            }),
          });

          if (!embeddingResponse.ok) {
            throw new Error(`OpenAI API error: ${await embeddingResponse.text()}`);
          }

          const embeddingData = await embeddingResponse.json();
          
          batch.forEach((text, idx) => {
            const chunkIndex = i + idx;
            chunksWithEmbeddings.push({
              text,
              chunk_index: chunkIndex,
              page_no: 1,
              char_start: chunkIndex * 1000,
              char_end: (chunkIndex + 1) * 1000,
              embedding: embeddingData.data[idx].embedding,
              metadata: {}
            });
          });
        }

        // Ingest chunks and embeddings
        const { error: ingestError } = await supabase.rpc('ingest_document_with_embeddings', {
          p_document_id: doc.id,
          p_chunks: chunksWithEmbeddings,
          p_user_id: user.id
        });

        if (ingestError) {
          throw ingestError;
        }

        results.push({ id: doc.id, title: doc.title, status: 'success' });
        console.log(`✓ Processed: ${doc.title}`);
      } catch (error: any) {
        results.push({ id: doc.id, title: doc.title, status: 'failed', error: error.message });
        console.error(`✗ Failed: ${doc.title}`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessed ${results.filter(r => r.status === 'success').length} of ${documentsWithoutEmbeddings.length} documents`,
        total: documents.length,
        needingReprocessing: documentsWithoutEmbeddings.length,
        processed: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Reprocess error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reprocess documents' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
