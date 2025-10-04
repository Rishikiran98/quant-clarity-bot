import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rerankChunks } from "../_shared/rerank.ts";

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper: Anonymize IP addresses (GDPR compliance)
const anonymizeIp = (ip: string): string => {
  if (!ip || ip === 'unknown') return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`; // Mask last octet
  }
  // For IPv6, mask last 80 bits
  const ipv6Parts = ip.split(':');
  if (ipv6Parts.length >= 4) {
    return ipv6Parts.slice(0, 4).join(':') + '::0';
  }
  return 'unknown';
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

// Helper: Log errors to database
async function logError(supabase: any, requestId: string, userId: string, errorCode: string, errorMessage: string, endpoint: string, ip: string) {
  try {
    await supabase.from('error_logs').insert({
      request_id: requestId,
      user_id: userId,
      error_code: errorCode,
      error_message: errorMessage,
      endpoint: endpoint,
      ip_address: anonymizeIp(ip),
    });
  } catch (err) {
    console.error('Failed to log error to DB:', err);
  }
}

// Helper function to generate embeddings via OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  console.log(`[EMBEDDING] Checking OPENAI_API_KEY... ${openaiKey ? 'EXISTS' : 'MISSING'}`);
  
  if (!openaiKey) {
    console.error('[EMBEDDING] CRITICAL: OPENAI_API_KEY not configured!');
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log(`[EMBEDDING] Calling OpenAI API for text length: ${text.length} chars`);
  
  try {
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

    console.log(`[EMBEDDING] OpenAI API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EMBEDDING] OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI embedding failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[EMBEDDING] Successfully got embedding with ${data.data[0].embedding.length} dimensions`);
    return data.data[0].embedding;
  } catch (error) {
    console.error('[EMBEDDING] Exception during embedding generation:', error);
    throw error;
  }
}

// ============================================================================
// 2. MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  console.log(`[${requestId}] === NEW REQUEST === Method: ${req.method}, IP: ${clientIp}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight - returning OPTIONS response`);
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
    console.log(`[${requestId}] Checking authorization header...`);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header found`);
      return errorResponse(ERROR_CODES.AUTH_401);
    }

    console.log(`[${requestId}] Creating Supabase client...`);
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`[${requestId}] Authenticating user...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`[${requestId}] Auth failed:`, authError?.message || 'No user');
      return errorResponse(ERROR_CODES.AUTH_401);
    }
    userId = user.id;
    console.log(`[${requestId}] User authenticated: ${userId}`);

    // Rate limiting
    const { data: isOverLimit } = await supabase.rpc('over_limit', { p_user: userId, p_limit: RATE_LIMIT });
    if (isOverLimit) return errorResponse(ERROR_CODES.RATE_429);

    // Log usage with anonymized IP
    await supabase.from('api_usage').insert({ 
      user_id: userId, 
      endpoint: 'financial-rag-query', 
      ip_address: anonymizeIp(clientIp) 
    });

    const { query } = await req.json();
    if (!query?.trim()) return errorResponse(ERROR_CODES.VALIDATION_400, "Query text is required");

    // Generate embedding for the query
    console.log(`[${requestId}] Generating embedding for query: "${query.slice(0, 100)}..."`);
    const embStart = Date.now();
    
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
      console.log(`[${requestId}] Embedding generated successfully in ${Date.now() - embStart}ms`);
    } catch (embError) {
      console.error(`[${requestId}] Embedding generation failed:`, embError);
      await logError(supabase, requestId, userId!, 'VECTOR_500', embError instanceof Error ? embError.message : 'Embedding failed', 'financial-rag-query', clientIp);
      return errorResponse(ERROR_CODES.VECTOR_500, 'Failed to generate query embedding');
    }
    
    const embLatency = Date.now() - embStart;
    
    // Perform vector search using Supabase RPC - retrieve more for re-ranking
    console.log(`[${requestId}] Searching documents with vector similarity`);
    const dbStart = Date.now();
    const { data: chunks, error: searchError } = await supabase.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_count: 30, // Retrieve 30 chunks for better re-ranking
      p_user_id: userId
    });
    const dbLatency = Date.now() - dbStart;

    if (searchError) {
      console.error(`[${requestId}] Vector search error:`, searchError);
      await logError(supabase, requestId, userId!, 'VECTOR_500', searchError.message, 'financial-rag-query', clientIp);
      return errorResponse(ERROR_CODES.VECTOR_500, searchError.message);
    }

    if (!chunks || chunks.length === 0) {
      console.warn(`[${requestId}] No documents found for user ${userId}`);
      await supabase.from('query_history').insert({
        user_id: userId,
        query: query,
        answer: "No documents found in the knowledge base.",
        avg_similarity: 0,
        documents_retrieved: 0,
      });
      
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any documents in your knowledge base. Please upload relevant financial documents to get started.",
          retrievedChunks: [],
          metadata: { 
            query, 
            chunksRetrieved: 0, 
            request_id: requestId, 
            latencyMs: Date.now() - startTime,
            embLatency,
            dbLatency,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply re-ranking with keyword matching and diversity
    const rerankStart = Date.now();
    const rerankedChunks = rerankChunks(query, chunks, 12, 0.4); // Top 12 with more diversity
    const rerankLatency = Date.now() - rerankStart;
    
    console.log(`[${requestId}] Re-ranked ${chunks.length} chunks to top ${rerankedChunks.length} in ${rerankLatency}ms`);
    
    // Filter by minimum relevance threshold - aggressive for high confidence
    const relevantChunks = rerankedChunks.filter((c: any) => c.similarity >= 0.25);
    
    if (relevantChunks.length === 0) {
      const maxSim = Math.max(...chunks.map((c: any) => c.similarity));
      
      console.warn(`[${requestId}] No relevant chunks found. Best similarity: ${(maxSim * 100).toFixed(1)}%`);
      
      await supabase.from('query_history').insert({
        user_id: userId,
        query: query,
        answer: `No sufficiently relevant information found (best match: ${(maxSim * 100).toFixed(1)}%).`,
        avg_similarity: maxSim,
        documents_retrieved: 0,
      });
      
      return new Response(
        JSON.stringify({
          answer: `I couldn't find information relevant enough to answer this question confidently. The best match I found was only ${(maxSim * 100).toFixed(1)}% similar.\n\nThis suggests:\n• The topic may not be covered in your uploaded documents\n• You might need to rephrase the question\n• Additional documents on this topic should be uploaded\n\nBest match found from: "${chunks[0].doc_title || 'Unknown document'}"`,
          retrievedChunks: chunks.slice(0, 3).map((c: any) => ({
            id: c.chunk_id,
            content: c.chunk_text.slice(0, 300),
            source: c.doc_title || 'Unknown',
            similarity: c.similarity,
            metadata: c.chunk_metadata || {}
          })),
          metadata: { 
            query, 
            chunksRetrieved: 0, 
            totalFound: chunks.length,
            bestSimilarity: maxSim,
            request_id: requestId, 
            latencyMs: Date.now() - startTime,
            embLatency,
            dbLatency,
            rerankLatency,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build enriched context from relevant chunks
    const context = relevantChunks.map((c: any, i: number) => {
      const docTitle = c.doc_title || 'Untitled Document';
      const similarity = (c.similarity * 100).toFixed(1);
      
      return `[Source ${i+1}: "${docTitle}", Relevance: ${similarity}%]
${c.chunk_text.trim()}`;
    }).join('\n\n' + '='.repeat(80) + '\n\n');
    
    // Enhanced prompt for financial analysis with confidence requirement
    const systemPrompt = `You are an expert financial analyst providing precise, source-grounded answers.

CRITICAL REQUIREMENT: Answer with 100% confidence using ONLY the provided sources. If sources fully support an answer, provide it comprehensively. If not, explicitly state information gaps.

ANSWER STRUCTURE:
1. **Direct Answer First**: Lead with the core answer in 1-2 sentences
2. **Supporting Details**: Provide specific numbers, metrics, and context from sources
3. **Source Citations**: Use [S1], [S2] inline for every fact
4. **Confidence Note**: If answer is partial, clearly state what's missing

QUALITY STANDARDS:
• Extract ALL relevant details (numbers, dates, percentages, trends)
• Synthesize across multiple sources when they complement each other
• Be precise - quote exact figures and timeframes
• Acknowledge any uncertainty or missing information
• Professional, concise language

QUESTION: ${query}

SOURCE DOCUMENTS:
${context}

Provide your high-confidence answer:`;

    const llmStart = Date.now();
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Using Pro for superior reasoning
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.2, // Lower for more precise, confident responses
        max_tokens: 2500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[${requestId}] AI gateway error:`, aiResponse.status, errorText);
      await logError(supabase, requestId, userId!, 'LLM_500', `AI gateway returned ${aiResponse.status}`, 'financial-rag-query', clientIp);
      return errorResponse(ERROR_CODES.LLM_500, `AI service error: ${aiResponse.status}`);
    }
    
    const llmLatency = Date.now() - llmStart;
    const answer = (await aiResponse.json()).choices[0].message.content;
    
    // Calculate metrics
    const avgSimilarity = relevantChunks.reduce((sum: number, c: any) => sum + c.similarity, 0) / relevantChunks.length;
    const totalLatency = Date.now() - startTime;
    
    // Log to query history
    await supabase.from('query_history').insert({
      user_id: userId,
      query: query,
      answer: answer.slice(0, 5000),
      avg_similarity: avgSimilarity.toFixed(4),
      documents_retrieved: relevantChunks.length,
    });
    
    // Log performance metrics
    await supabase.from('performance_metrics').insert({
      endpoint: 'financial-rag-query',
      user_id: userId,
      latency_ms: totalLatency,
      chunks_retrieved: relevantChunks.length,
      avg_similarity: avgSimilarity.toFixed(4),
      llm_latency_ms: llmLatency,
      db_latency_ms: dbLatency,
    });

    console.log(`[${requestId}] Query completed in ${totalLatency}ms (emb: ${embLatency}ms, db: ${dbLatency}ms, rerank: ${rerankLatency}ms, llm: ${llmLatency}ms)`);

    return new Response(
      JSON.stringify({
        answer,
        retrievedChunks: relevantChunks.map((c: any) => ({ 
          id: c.chunk_id,
          content: c.chunk_text.substring(0, 500), 
          source: c.doc_title || 'Unknown', 
          similarity: c.similarity,
          metadata: c.chunk_metadata || {}
        })),
        metadata: { 
          query, 
          chunksRetrieved: relevantChunks.length,
          totalFound: chunks.length,
          chunksAfterRerank: rerankedChunks.length,
          avgSimilarity,
          request_id: requestId, 
          latencyMs: totalLatency,
          embLatency,
          dbLatency,
          rerankLatency,
          llmLatency,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error to database if we have userId
    if (userId && supabase) {
      await logError(supabase, requestId, userId, 'SERVER_500', errorMessage, 'financial-rag-query', clientIp);
    }
    
    return errorResponse(ERROR_CODES.SERVER_500, errorMessage);
  }
});
