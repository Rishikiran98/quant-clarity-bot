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

    // Trigger background processing with service role
    const processResult = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentId: insertedDoc.id })
    });

    if (!processResult.ok) {
      const errorText = await processResult.text();
      console.error('Processing error:', processResult.status, errorText);
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
