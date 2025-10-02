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

// Mock financial document database (TODO: Remove after implementing real vector search)
const FINANCIAL_DOCS = [
  {
    id: "tsla-10k-2024-p23",
    content: "Risk Factor: Supply Chain Disruptions - We are subject to risks associated with supply chain disruptions, particularly in sourcing battery cells, semiconductors, and other critical components.",
    source: "Tesla 10-K 2024, Page 23",
    metadata: { ticker: "TSLA", fiscal_year: 2024, category: "Risk Factors", doc_type: "10-K" }
  },
  {
    id: "msft-10q-2023-q4-p45",
    content: "Cloud Computing Growth - Our Azure cloud platform continues to experience strong growth, driven by increased demand for digital transformation solutions.",
    source: "Microsoft 10-Q 2023 Q4, Page 45",
    metadata: { ticker: "MSFT", fiscal_year: 2023, quarter: 4, category: "Business Highlights", doc_type: "10-Q" }
  },
  {
    id: "aapl-8k-2024-01-p12",
    content: "Acquisition of AI Startup - We completed the acquisition of a promising AI startup focused on natural language processing, enhancing our capabilities in machine learning.",
    source: "Apple 8-K 2024-01, Page 12",
    metadata: { ticker: "AAPL", fiscal_year: 2024, category: "Acquisitions", doc_type: "8-K" }
  },
  {
    id: "goog-10k-2023-p78",
    content: "Regulatory Scrutiny - We are facing increased regulatory scrutiny regarding our advertising practices and data privacy policies, which could impact our future growth.",
    source: "Google 10-K 2023, Page 78",
    metadata: { ticker: "GOOG", fiscal_year: 2023, category: "Legal & Regulatory", doc_type: "10-K" }
  },
  {
    id: "amzn-10k-2022-p101",
    content: "E-commerce Sales Growth - Our e-commerce sales continue to grow, driven by increased Prime memberships and expansion into new international markets.",
    source: "Amazon 10-K 2022, Page 101",
    metadata: { ticker: "AMZN", fiscal_year: 2022, category: "Sales & Marketing", doc_type: "10-K" }
  }
];

function calculateSimilarity(query: string, docContent: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const docTerms = docContent.toLowerCase().split(/\s+/);
  const matches = queryTerms.filter(term => docTerms.some(docTerm => docTerm.includes(term)));
  return Math.min(0.98, Math.max(0.65, matches.length / queryTerms.length + (Math.random() - 0.5) * 0.1));
}

function retrieveDocuments(query: string, topK: number = 3) {
  return FINANCIAL_DOCS
    .map(doc => ({ ...doc, similarity: calculateSimilarity(query, doc.content) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
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

    // PRODUCTION TODO: Replace with real vector search
    const retrievedChunks = retrieveDocuments(query, 3);
    
    const context = retrievedChunks.map((c, i) => `[Document ${i+1}]\nSource: ${c.source}\nContent: ${c.content}`).join('\n\n');
    
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
        retrievedChunks: retrievedChunks.map(c => ({ content: c.content.substring(0, 500), source: c.source, similarity: c.similarity })),
        metadata: { query, chunksRetrieved: retrievedChunks.length, request_id: requestId }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return errorResponse(ERROR_CODES.SERVER_500, error instanceof Error ? error.message : 'Unknown error');
  }
});
