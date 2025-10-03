import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping URL:', url, 'for user:', user.id);

    // Fetch the URL directly
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinancialRAG/1.0; +https://yoursite.com/bot)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Fetched HTML, length:', html.length);

    // Parse HTML
    const document = new DOMParser().parseFromString(html, 'text/html');
    
    if (!document) {
      throw new Error('Failed to parse HTML');
    }

    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach((el: any) => el._remove());

    // Extract text content
    const textContent = document.body?.textContent || '';
    const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

    // Extract title
    const titleElement = document.querySelector('title');
    const title = titleElement?.textContent || new URL(url).hostname;

    console.log('Extracted content:', { title, contentLength: cleanedContent.length });

    if (cleanedContent.length < 100) {
      throw new Error('Insufficient content extracted from URL');
    }

    // Insert into database
    const { data: insertedDoc, error: insertError } = await supabase
      .from('documents')
      .insert({
        title: title.substring(0, 200),
        content: cleanedContent.substring(0, 50000),
        source: url,
        owner_id: user.id,
        uploaded_by: user.id,
        mime_type: 'text/html'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Document inserted:', insertedDoc.id);

    // Generate embeddings inline
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.warn('OpenAI API key not configured, skipping embeddings');
      return new Response(
        JSON.stringify({
          success: true,
          documentId: insertedDoc.id,
          title: title,
          contentLength: cleanedContent.length,
          warning: 'Embeddings not generated - API key missing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chunk the text
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

    const chunks = chunkText(cleanedContent);
    console.log(`Created ${chunks.length} chunks`);

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
        console.error('OpenAI API error:', await embeddingResponse.text());
        break;
      }

      const embeddingData = await embeddingResponse.json();
      
      batch.forEach((text, idx) => {
        chunksWithEmbeddings.push({
          text,
          page_no: 1,
          char_start: i + idx,
          char_end: i + idx + text.length,
          embedding: embeddingData.data[idx].embedding,
          metadata: {}
        });
      });
    }

    // Ingest chunks and embeddings
    if (chunksWithEmbeddings.length > 0) {
      const { error: ingestError } = await supabase.rpc('ingest_document_with_embeddings', {
        p_document_id: insertedDoc.id,
        p_chunks: chunksWithEmbeddings,
        p_user_id: user.id
      });

      if (ingestError) {
        console.error('Ingest error:', ingestError);
      } else {
        console.log(`✓ Ingested ${chunksWithEmbeddings.length} chunks`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: insertedDoc.id,
        title: title,
        contentLength: cleanedContent.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to scrape URL' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
