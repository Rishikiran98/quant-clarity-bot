import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's token to verify auth
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Reprocessing documents for user:', user.id);

    // Create service role client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all documents without embeddings
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('owner_id', user.id);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No documents to reprocess',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which documents don't have embeddings
    const documentsWithoutEmbeddings = [];
    for (const doc of documents) {
      const { data: embeddings } = await supabase
        .from('embeddings')
        .select('id')
        .eq('document_id', doc.id)
        .limit(1);

      if (!embeddings || embeddings.length === 0) {
        documentsWithoutEmbeddings.push(doc);
      }
    }

    console.log(`Found ${documentsWithoutEmbeddings.length} documents without embeddings`);

    // Trigger processing for each document
    const results = [];
    for (const doc of documentsWithoutEmbeddings) {
      console.log(`Processing document: ${doc.title}`);
      
      const processResult = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId: doc.id })
      });

      if (processResult.ok) {
        results.push({ id: doc.id, title: doc.title, status: 'success' });
        console.log(`✓ Processed: ${doc.title}`);
      } else {
        const errorText = await processResult.text();
        results.push({ id: doc.id, title: doc.title, status: 'failed', error: errorText });
        console.error(`✗ Failed: ${doc.title}`, errorText);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessed ${results.filter(r => r.status === 'success').length} of ${documentsWithoutEmbeddings.length} documents`,
        total: documents.length,
        needingReprocessing: documentsWithoutEmbeddings.length,
        processed: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Reprocess error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reprocess documents' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
