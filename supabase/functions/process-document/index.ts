// Production-ready document processing with PDF.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chunkText } from "../_shared/chunkText.ts";
import { logError, logPerformance, errorResponse, successResponse } from "../_shared/logger.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,content-type,x-client-info,apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logError(supabase, "AUTH_401", "Missing authorization header", req);
      return errorResponse("AUTH_401", "Unauthorized", requestId, 401);
    }

    // Create authenticated client
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      await logError(supabase, "AUTH_401", "Invalid token", req);
      return errorResponse("AUTH_401", "Unauthorized", requestId, 401);
    }

    // Check Content-Length before parsing form data
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
      await logError(supabase, "VALIDATION_413", `Request too large: ${contentLength} bytes`, req, user.id);
      return errorResponse("VALIDATION_413", "File too large (max 25MB)", requestId, 413);
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") ?? file?.name ?? "Untitled").toString();

    if (!file) {
      await logError(supabase, "VALIDATION_400", "Missing file", req, user.id);
      return errorResponse("VALIDATION_400", "File is required", requestId, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      await logError(supabase, "VALIDATION_413", `File too large: ${file.size} bytes`, req, user.id);
      return errorResponse("VALIDATION_413", "File too large (max 25MB)", requestId, 413);
    }

    console.log(`[${requestId}] Processing document: ${title} (${file.size} bytes)`);

    // Extract text from PDF using PDF.js
    const extractStart = performance.now();
    const buffer = await file.arrayBuffer();
    
    try {
      const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
      const uint8Array = new Uint8Array(buffer);
      
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      
      let fullText = '';
      const numPages = pdfDoc.numPages;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
      }
      
      const extractTime = performance.now() - extractStart;
      
      console.log(`[${requestId}] Extracted ${fullText.length} chars from ${numPages} pages in ${extractTime.toFixed(0)}ms`);

      if (!fullText || fullText.length < 50) {
        await logError(supabase, "VALIDATION_400", "No extractable text found", req, user.id);
        return errorResponse("VALIDATION_400", "PDF contains no extractable text", requestId, 400);
      }

      // Chunk text
      const chunkStart = performance.now();
      const chunks = chunkText(fullText, 1000, 200);
      const chunkTime = performance.now() - chunkStart;

      console.log(`[${requestId}] Created ${chunks.length} chunks in ${chunkTime.toFixed(0)}ms`);

      // Generate embeddings in batches
      const embeddingStart = performance.now();
      const batchSize = 100;
      const embeddings: Array<{ chunk_index: number; text: string; embedding: number[] }> = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: batch,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`Embedding failed: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();

        batch.forEach((text, batchIdx) => {
          embeddings.push({
            chunk_index: i + batchIdx,
            text,
            embedding: embeddingData.data[batchIdx].embedding,
          });
        });

        console.log(`[${requestId}] Generated embeddings for batch ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}`);
      }

      const embeddingTime = performance.now() - embeddingStart;
      console.log(`[${requestId}] Generated ${embeddings.length} embeddings in ${embeddingTime.toFixed(0)}ms`);

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          title,
          owner_id: user.id,
          source: "upload",
          content: fullText.slice(0, 10000), // Store preview
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .maybeSingle();

      if (docError || !doc) {
        console.error(`[${requestId}] Document creation failed:`, docError);
        await logError(supabase, "DB_500", docError?.message || "Document creation failed", req, user.id);
        return errorResponse("DB_500", "Failed to create document", requestId, 500);
      }

      // Ingest chunks with embeddings using RPC
      const ingestStart = performance.now();
      const rpcPayload = embeddings.map((e) => ({
        page_no: Math.floor(e.chunk_index / 3) + 1, // Estimate page number
        char_start: e.chunk_index * 800,
        char_end: (e.chunk_index + 1) * 800,
        text: e.text,
        embedding: e.embedding,
        metadata: { length: e.text.length },
      }));

      const { error: ingestError } = await supabase.rpc("ingest_document_with_embeddings", {
        p_document_id: doc.id,
        p_chunks: rpcPayload,
        p_user_id: user.id,
      });

      if (ingestError) {
        console.error(`[${requestId}] Ingestion failed:`, ingestError);
        await logError(supabase, "DB_500", ingestError.message, req, user.id);
        return errorResponse("DB_500", "Failed to ingest document", requestId, 500);
      }

      const ingestTime = performance.now() - ingestStart;
      console.log(`[${requestId}] Ingested ${embeddings.length} chunks in ${ingestTime.toFixed(0)}ms`);

      // Log performance metrics
      const totalTime = performance.now() - startTime;
      await logPerformance(supabase, user.id, "process-document", {
        latency: totalTime,
        chunks: embeddings.length,
        embedding: embeddingTime,
      });

      console.log(`[${requestId}] Completed in ${totalTime.toFixed(0)}ms`);

      return successResponse({
        ok: true,
        requestId,
        document_id: doc.id,
        chunks: embeddings.length,
        pages: numPages,
        metrics: {
          extractTime: Math.round(extractTime),
          embeddingTime: Math.round(embeddingTime),
          ingestTime: Math.round(ingestTime),
          totalTime: Math.round(totalTime),
        },
      });
    } catch (pdfError) {
      const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      console.error(`[${requestId}] PDF extraction error:`, pdfError);
      await logError(supabase, "PDF_PARSE_500", pdfErrorMessage, req, user.id);
      return errorResponse("PDF_PARSE_500", "Failed to parse PDF", requestId, 500);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Unexpected error:`, error);
    
    await logError(supabase, "UNCAUGHT_500", errorMessage, req);
    
    return errorResponse("UNCAUGHT_500", "Internal server error", requestId, 500);
  }
});
