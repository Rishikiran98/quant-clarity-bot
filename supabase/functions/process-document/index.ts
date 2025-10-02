import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Text chunking configuration
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Helper: Split text into chunks
function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Add overlap
      const words = currentChunk.split(/\s+/);
      currentChunk = words.slice(-Math.floor(CHUNK_OVERLAP / 5)).join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(c => c.length > 50); // Filter out tiny chunks
}

// Helper: Generate embedding via OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text.substring(0, 8000), // Limit to 8k chars for embedding
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embedding failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper: Extract text from PDF
async function extractTextFromPDF(file: File): Promise<string> {
  // For now, return a placeholder. In production, use a PDF parsing library
  // or external service like pdf.co or similar
  console.warn('PDF text extraction not yet implemented - using filename as content');
  return `PDF Document: ${file.name}\n\nContent extraction will be implemented in a future update.`;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing document upload`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${requestId}] Fetching document ${documentId}`);

    // Fetch the document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let text = doc.content || '';

    // If there's a file, download and extract text
    if (doc.file_path && doc.mime_type === 'application/pdf') {
      console.log(`[${requestId}] Downloading PDF from storage`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('financial-documents')
        .download(doc.file_path);

      if (!downloadError && fileData) {
        text = await extractTextFromPDF(fileData as any);
      }
    }

    if (!text || text.length < 50) {
      return new Response(JSON.stringify({ error: 'No text content to process' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${requestId}] Splitting text into chunks (${text.length} chars)`);
    const chunks = splitTextIntoChunks(text);
    console.log(`[${requestId}] Generated ${chunks.length} chunks`);

    // Process chunks and generate embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      console.log(`[${requestId}] Processing chunk ${i + 1}/${chunks.length}`);

      // Generate embedding
      const embedding = await generateEmbedding(chunkText);

      // Insert chunk
      const { data: chunkData, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          text: chunkText,
          chunk_index: i,
          metadata: { char_count: chunkText.length }
        })
        .select()
        .single();

      if (chunkError) {
        console.error(`[${requestId}] Chunk insert error:`, chunkError);
        throw chunkError;
      }

      // Insert embedding
      const { error: embeddingError } = await supabase
        .from('embeddings')
        .insert({
          document_id: documentId,
          chunk_id: chunkData.id,
          embedding: embedding,
          metadata: { chunk_index: i }
        });

      if (embeddingError) {
        console.error(`[${requestId}] Embedding insert error:`, embeddingError);
        throw embeddingError;
      }
    }

    console.log(`[${requestId}] Successfully processed ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksProcessed: chunks.length,
        documentId,
        requestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
