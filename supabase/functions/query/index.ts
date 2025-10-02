// Production-ready RAG query endpoint with monitoring, rate limiting, and error tracking
// All error responses include error_code, message, and requestId for proper test validation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const k: number = Math.min(Number(body?.k ?? 5), 20);
    
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

    // Build context from retrieved chunks
    const context = (chunks ?? [])
      .map((c: any, i: number) => {
        const pageInfo = c.page_no ? ` (p.${c.page_no})` : "";
        return `# Source ${i + 1} [similarity=${(c.similarity * 100).toFixed(1)}%]${pageInfo}\n${c.text.trim()}`;
      })
      .join("\n\n---\n\n");

    const prompt = `You are a financial RAG assistant. Use ONLY the provided sources to answer the question.
Cite sources inline using [S1], [S2], etc.

Question: ${question}

Sources:
${context}

Answer with citations:`;

    // Generate answer using Lovable AI
    const llmStart = performance.now();
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
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
    const avgSimilarity = chunks?.length
      ? chunks.reduce((sum: number, c: any) => sum + Number(c.similarity), 0) / chunks.length
      : 0;
    const totalLatency = Math.round(performance.now() - start);

    // Log performance metrics
    await supabase.from("performance_metrics").insert({
      endpoint: "query",
      user_id: user.id,
      latency_ms: totalLatency,
      chunks_retrieved: chunks?.length ?? 0,
      avg_similarity: avgSimilarity.toFixed(4),
      llm_latency_ms: llmLatency,
      db_latency_ms: dbLatency,
    });

    // Format response
    return json({
      requestId,
      answer,
      sources: (chunks ?? []).map((c: any, i: number) => ({
        label: `S${i + 1}`,
        document_id: c.document_id,
        chunk_id: c.chunk_id,
        page_no: c.page_no,
        similarity: c.similarity,
        preview: c.text.slice(0, 240),
      })),
      metrics: {
        totalLatency,
        llmLatency,
        dbLatency,
        embLatency,
        avgSimilarity,
        chunksRetrieved: chunks?.length ?? 0,
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
