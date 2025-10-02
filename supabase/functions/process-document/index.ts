// Production-ready document processing with PDF extraction, chunking, and embedding
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
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]/g, "_").slice(0, 128);
}

async function extractTextFromPDF(blob: Blob): Promise<{ page_no: number; text: string }[]> {
  try {
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
    
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    const pages: { page_no: number; text: string }[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      pages.push({ page_no: i, text });
    }
    
    return pages;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface ChunkData {
  page_no: number;
  char_start: number;
  char_end: number;
  text: string;
  embedding?: number[];
}

function chunkPages(pages: { page_no: number; text: string }[]): ChunkData[] {
  const chunks: ChunkData[] = [];
  
  for (const page of pages) {
    const text = page.text || "";
    let i = 0;
    
    while (i < text.length) {
      const start = i;
      const end = Math.min(i + CHUNK_SIZE, text.length);
      const chunkText = text.slice(start, end);
      
      if (chunkText.trim().length > 50) {
        chunks.push({
          page_no: page.page_no,
          char_start: start,
          char_end: end,
          text: chunkText,
        });
      }
      
      i += CHUNK_SIZE - CHUNK_OVERLAP;
    }
  }
  
  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const batchSize = 100;
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: batch,
        model: "text-embedding-3-small",
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.status}`);
    }
    
    const data = await response.json();
    embeddings.push(...data.data.map((d: any) => d.embedding));
  }
  
  return embeddings;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const requestId = crypto.randomUUID();

  try {
    // Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401, headers: CORS });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401, headers: CORS });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") ?? "").toString() || "Untitled";
    const source = (formData.get("source") ?? "upload").toString();

    if (!file) {
      return new Response("File missing", { status: 400, headers: CORS });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response("File too large (max 25MB)", { status: 413, headers: CORS });
    }

    // Upload file to storage
    const fileName = sanitizeFilename(file.name || `${crypto.randomUUID()}.pdf`);
    const filePath = `${user.id}/${fileName}`;
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("financial-documents")
      .upload(filePath, fileBytes, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response("Upload failed", { status: 500, headers: CORS });
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        owner_id: user.id,
        title,
        source,
        file_path: filePath,
        content: "", // Will be populated from chunks
        mime_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (docError) {
      console.error("Doc create error:", docError);
      return new Response("Document creation failed", { status: 500, headers: CORS });
    }

    // Extract text from PDF
    const pages = await extractTextFromPDF(file);
    console.log(`Extracted ${pages.length} pages from PDF`);

    // Chunk the pages
    const chunks = chunkPages(pages);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks.map(c => c.text));
    console.log(`Generated ${embeddings.length} embeddings`);

    // Attach embeddings to chunks
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    // Prepare payload for RPC
    const rpcPayload = chunks.map(c => ({
      page_no: c.page_no,
      char_start: c.char_start,
      char_end: c.char_end,
      text: c.text,
      embedding: c.embedding,
      metadata: { length: c.text.length },
    }));

    // Ingest document with embeddings
    const { error: ingestError } = await supabase.rpc("ingest_document_with_embeddings", {
      p_document_id: doc.id,
      p_chunks: rpcPayload,
      p_user_id: user.id,
    });

    if (ingestError) {
      console.error("Ingest error:", ingestError);
      return new Response(`Ingest failed: ${ingestError.message}`, {
        status: 500,
        headers: CORS,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        requestId,
        document_id: doc.id,
        chunks: chunks.length,
        pages: pages.length,
      }),
      {
        headers: { "Content-Type": "application/json", ...CORS },
      }
    );
  } catch (error) {
    console.error("Process error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS },
      }
    );
  }
});
