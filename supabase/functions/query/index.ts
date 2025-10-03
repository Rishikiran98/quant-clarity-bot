// Production-ready RAG query endpoint with monitoring, rate limiting, and error tracking
// All error responses include error_code, message, and requestId for proper test validation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rerankChunks } from "../_shared/rerank.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,content-type,x-client-info,apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RATE_LIMIT = 30;

// Helper: Anonymize IP addresses (GDPR compliance)
const anonymizeIp = (ip: string): string => {
  if (!ip || ip === 'unknown' || ip === '0.0.0.0') return 'unknown';
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    },
  });
}

function errorResponse(code: string, message: string, requestId: string, status = 400) {
  return new Response(
    JSON.stringify({ error_code: code, message, requestId }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    }
  );
}

serve(async (req) => {
  const start = performance.now();
  const requestId = crypto.randomUUID();
  
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "0.0.0.0";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  try {
    // Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("AUTH_401", "Unauthorized", requestId, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("AUTH_401", "Unauthorized", requestId, 401);
    }

    // Rate limiting - user based
    const { data: overByUser } = await supabase.rpc("over_limit", {
      p_user: user.id,
      p_limit: RATE_LIMIT,
    });
    if (overByUser) {
      return errorResponse("RATE_429", "Too many requests", requestId, 429);
    }

    // Rate limiting - IP based (3x limit)
    const { data: overByIp } = await supabase.rpc("over_limit_by_ip", {
      p_ip: ip,
      p_limit: RATE_LIMIT * 3,
    });
    if (overByIp) {
      return errorResponse("RATE_429", "Too many requests from IP", requestId, 429);
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const question: string = (body?.question ?? "").toString();
    const k: number = Math.min(Number(body?.k ?? 15), 30); // Retrieve more, then re-rank
    
    if (!question.trim()) {
      return errorResponse("VALIDATION_400", "Question required", requestId, 400);
    }

    // Log API usage with anonymized IP
    await supabase.from("api_usage").insert({
      user_id: user.id,
      endpoint: "query",
      ip_address: anonymizeIp(ip),
    });

    // Generate embedding
    const embStart = performance.now();
    const embResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: question,
        model: "text-embedding-3-small",
      }),
    });

    if (!embResp.ok) {
      const embError = await embResp.text();
      await supabase.from("error_logs").insert({
        error_code: "EMBED_FAIL",
        error_message: embError,
        request_id: requestId,
        user_id: user.id,
        endpoint: "query",
        ip_address: ip,
        user_agent: userAgent,
      });
      return errorResponse("EMBED_500", "Embedding generation failed", requestId, 500);
    }

    const embJson = await embResp.json();
    const queryEmbedding = embJson.data[0].embedding as number[];
    const embLatency = Math.round(performance.now() - embStart);

    // Vector search
    const dbStart = performance.now();
    const { data: chunks, error: searchError } = await supabase.rpc("search_documents", {
      query_embedding: queryEmbedding,
      match_count: k,
      p_user_id: user.id,
    });

    if (searchError) {
      await supabase.from("error_logs").insert({
        error_code: "VECTOR_SEARCH_FAIL",
        error_message: searchError.message,
        request_id: requestId,
        user_id: user.id,
        endpoint: "query",
        ip_address: ip,
        user_agent: userAgent,
      });
      return errorResponse("SEARCH_500", "Vector search failed", requestId, 500);
    }

    const dbLatency = Math.round(performance.now() - dbStart);

    if (!chunks || chunks.length === 0) {
      // No documents found at all
      await supabase.from("query_history").insert({
        user_id: user.id,
        query: question,
        answer: "No documents found in the knowledge base. Please upload relevant documents first.",
        avg_similarity: 0,
        documents_retrieved: 0,
      });
      
      return json({
        requestId,
        answer: "I couldn't find any documents in your knowledge base. Please upload relevant documents to get started.",
        sources: [],
        metrics: {
          totalLatency: Math.round(performance.now() - start),
          chunksRetrieved: 0,
          avgSimilarity: 0,
        },
      });
    }

    // Apply re-ranking with keyword matching and diversity
    const rerankStart = performance.now();
    const rerankedChunks = rerankChunks(question, chunks, 8); // Top 8 after re-ranking
    const rerankLatency = Math.round(performance.now() - rerankStart);
    
    console.log(`[${requestId}] Re-ranked ${chunks.length} chunks to top ${rerankedChunks.length} in ${rerankLatency}ms`);
    
    // Filter by minimum relevance threshold
    const relevantChunks = rerankedChunks.filter((c: any) => c.similarity >= 0.4); // Lowered to 40% after re-ranking
    
    if (relevantChunks.length === 0) {
      // Found chunks but none are relevant enough
      const maxSim = Math.max(...chunks.map((c: any) => c.similarity));
      
      await supabase.from("query_history").insert({
        user_id: user.id,
        query: question,
        answer: `No sufficiently relevant information found (best match: ${(maxSim * 100).toFixed(1)}%). The question may be outside the scope of uploaded documents.`,
        avg_similarity: maxSim,
        documents_retrieved: 0,
      });
      
      return json({
        requestId,
        answer: `I couldn't find information relevant enough to answer this question confidently. The best match I found was only ${(maxSim * 100).toFixed(1)}% similar.\n\nThis suggests:\n1. The topic may not be covered in your uploaded documents\n2. You might need to rephrase the question\n3. Additional documents on this topic should be uploaded\n\nBest match found from: "${chunks[0].doc_title}"`,
        sources: chunks.slice(0, 3).map((c: any, i: number) => ({
          label: `S${i + 1}`,
          document_id: c.document_id,
          document_title: c.doc_title || "Untitled",
          similarity: c.similarity,
          preview: c.chunk_text.slice(0, 200),
        })),
        metrics: {
          totalLatency: Math.round(performance.now() - start),
          chunksRetrieved: 0,
          avgSimilarity: maxSim,
          totalChunksFound: chunks.length,
        },
      });
    }
    
    // Build rich context with metadata
    const context = relevantChunks
      .map((c: any, i: number) => {
        const pageInfo = c.page_no ? `Page ${c.page_no}` : "Document";
        const docTitle = c.doc_title || "Untitled";
        const similarity = (c.similarity * 100).toFixed(1);
        
        return `[Source ${i + 1}: "${docTitle}" - ${pageInfo}, Relevance: ${similarity}%]
${c.chunk_text.trim()}`;
      })
      .join("\n\n" + "=".repeat(80) + "\n\n");

    const prompt = `You are an expert financial analysis assistant with deep knowledge of corporate finance, accounting, and investment analysis.

TASK: Provide a comprehensive, accurate answer to the user's question based EXCLUSIVELY on the provided source documents.

INSTRUCTIONS:
1. **Synthesize & Structure**: Combine information from multiple sources when available. Structure your answer clearly with relevant sections or bullet points
2. **Cite Sources**: Use inline citations [S1], [S2], etc. for every key fact, figure, or claim
3. **Be Specific**: Include exact numbers, dates, percentages, and metrics when mentioned in sources
4. **Handle Conflicts**: If sources contain contradictory information, acknowledge both perspectives with citations
5. **Acknowledge Gaps**: If sources don't fully answer the question, clearly state what information is missing or unavailable
6. **Professional Tone**: Write in a clear, professional style appropriate for financial analysis
7. **No Hallucination**: Never introduce information not present in the sources, even if you know it from general knowledge

QUESTION:
${question}

AVAILABLE SOURCES:
${context}

Provide your comprehensive answer with inline citations:`;

    // Generate answer using Lovable AI
    const llmStart = performance.now();
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Upgraded to Pro for better reasoning
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Lower temperature for more focused, factual responses
        max_tokens: 2000, // Allow longer, more detailed responses
      }),
    });

    if (!aiResp.ok) {
      const aiError = await aiResp.text();
      await supabase.from("error_logs").insert({
        error_code: "LLM_FAIL",
        error_message: aiError,
        request_id: requestId,
        user_id: user.id,
        endpoint: "query",
        ip_address: ip,
        user_agent: userAgent,
      });
      return errorResponse("LLM_500", "AI generation failed", requestId, 500);
    }

    const aiJson = await aiResp.json();
    const answer = aiJson.choices[0].message.content as string;
    const llmLatency = Math.round(performance.now() - llmStart);

    // Calculate metrics
    const avgSimilarity = relevantChunks.length
      ? relevantChunks.reduce((sum: number, c: any) => sum + Number(c.similarity), 0) / relevantChunks.length
      : 0;
    const totalLatency = Math.round(performance.now() - start);

    // Log query to history
    await supabase.from("query_history").insert({
      user_id: user.id,
      query: question,
      answer: answer.slice(0, 5000), // Store first 5000 chars
      avg_similarity: avgSimilarity.toFixed(4),
      documents_retrieved: relevantChunks.length,
    });

    // Log performance metrics
    await supabase.from("performance_metrics").insert({
      endpoint: "query",
      user_id: user.id,
      latency_ms: totalLatency,
      chunks_retrieved: relevantChunks.length,
      avg_similarity: avgSimilarity.toFixed(4),
      llm_latency_ms: llmLatency,
      db_latency_ms: dbLatency,
    });

    // Format response with enhanced source information
    return json({
      requestId,
      answer,
      sources: relevantChunks.map((c: any, i: number) => ({
        label: `S${i + 1}`,
        document_id: c.document_id,
        document_title: c.doc_title || "Untitled",
        chunk_id: c.chunk_id,
        page_no: c.page_no,
        similarity: c.similarity,
        preview: c.chunk_text.slice(0, 300),
      })),
      metrics: {
        totalLatency,
        llmLatency,
        dbLatency,
        embLatency,
        rerankLatency,
        avgSimilarity,
        chunksRetrieved: relevantChunks.length,
        totalChunksFound: chunks.length,
        chunksAfterRerank: rerankedChunks.length,
      },
    });
  } catch (error) {
    // Log unexpected errors
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await adminClient.from("error_logs").insert({
        error_code: "UNCAUGHT_500",
        error_message: error instanceof Error ? error.message : String(error),
        request_id: requestId,
        endpoint: "query",
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch {
      console.error("Failed to log error:", error);
    }

    return errorResponse(
      "UNCAUGHT_500",
      error instanceof Error ? error.message : "Unexpected server error",
      requestId,
      500
    );
  }
});
