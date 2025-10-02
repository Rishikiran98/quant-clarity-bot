import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Error taxonomy for consistent error handling
const ERROR_CODES = {
  AUTH_401: { code: 'AUTH_401', message: 'Unauthorized - valid JWT required', status: 401 },
  RATE_429: { code: 'RATE_429', message: 'Rate limit exceeded - max 30 queries/min', status: 429 },
  VALIDATION_400: { code: 'VALIDATION_400', message: 'Invalid request payload', status: 400 },
  VECTOR_500: { code: 'VECTOR_500', message: 'Vector search failed', status: 500 },
  LLM_500: { code: 'LLM_500', message: 'AI model error', status: 500 },
  SERVER_500: { code: 'SERVER_500', message: 'Internal server error', status: 500 },
};

const RATE_LIMIT = 30; // 30 queries per minute per user

// Helper function to generate embeddings via OpenAI
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
      input: text,
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

// ============================================================================
// 2. MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const errorResponse = (error: typeof ERROR_CODES[keyof typeof ERROR_CODES], details?: string) => {
    return new Response(
      JSON.stringify({ error: error.code, message: error.message, details, request_id: requestId }),
      { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  };

  let userId: string | undefined;
  let supabase: any;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse(ERROR_CODES.AUTH_401);

    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return errorResponse(ERROR_CODES.AUTH_401);
    userId = user.id;

    // Rate limiting
    const { data: isOverLimit } = await supabase.rpc('over_limit', { p_user: userId, p_limit: RATE_LIMIT });
    if (isOverLimit) return errorResponse(ERROR_CODES.RATE_429);

    // Log usage
    await supabase.from('api_usage').insert({ user_id: userId, endpoint: 'financial-rag-query', ip_address: clientIp });

    const { query } = await req.json();
    if (!query?.trim()) return errorResponse(ERROR_CODES.VALIDATION_400);

    // Generate embedding for the query
    console.log(`[${requestId}] Generating embedding for query`);
    const queryEmbedding = await generateEmbedding(query);
    
    // Perform vector search using Supabase RPC
    console.log(`[${requestId}] Searching documents with vector similarity`);
    const { data: chunks, error: searchError } = await supabase.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_count: 5,
      p_user_id: userId
    });

    if (searchError) {
      console.error(`[${requestId}] Vector search error:`, searchError);
      return errorResponse(ERROR_CODES.VECTOR_500, searchError.message);
    }

    if (!chunks || chunks.length === 0) {
      console.warn(`[${requestId}] No documents found for user ${userId}`);
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any relevant documents in the knowledge base. Please ensure documents have been uploaded and processed.",
          retrievedChunks: [],
          metadata: { query, chunksRetrieved: 0, request_id: requestId }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const retrievedChunks = chunks.map((c: any) => ({
      content: c.text,
      source: c.doc_title || 'Unknown',
      similarity: c.similarity,
      metadata: c.chunk_metadata || {}
    }));
    
    const context = retrievedChunks.map((c: any, i: number) => 
      `[Document ${i+1}]\nSource: ${c.source}\nSimilarity: ${(c.similarity * 100).toFixed(1)}%\nContent: ${c.content}`
    ).join('\n\n');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a financial analysis AI. Answer only from provided documents with citations.' },
          { role: 'user', content: `Query: ${query}\n\nContext:\n${context}` }
        ],
      }),
    });

    if (!aiResponse.ok) return errorResponse(ERROR_CODES.LLM_500);
    
    const answer = (await aiResponse.json()).choices[0].message.content;

    return new Response(
      JSON.stringify({
        answer,
        retrievedChunks: retrievedChunks.map((c: any) => ({ content: c.content.substring(0, 500), source: c.source, similarity: c.similarity })),
        metadata: { query, chunksRetrieved: retrievedChunks.length, request_id: requestId }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return errorResponse(ERROR_CODES.SERVER_500, error instanceof Error ? error.message : 'Unknown error');
  }
});
