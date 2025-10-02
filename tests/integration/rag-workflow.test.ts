/**
 * Integration test for full RAG workflow
 * Tests: Auth → Upload → Process → Query → Verify Results
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TEST_EMAIL = "test-rag@example.com";
const TEST_PASSWORD = "TestRAG123!@#";

Deno.test({
  name: "Full RAG workflow: upload → process → query",
  ignore: !Deno.env.get("RUN_INTEGRATION_TESTS"), // Only run when explicitly enabled
  async fn() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Step 1: Create test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (signUpError && !signUpError.message.includes("already registered")) {
      throw signUpError;
    }

    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (authError) throw authError;
    assertExists(authData.session);

    const token = authData.session.access_token;
    const userId = authData.user.id;

    try {
      // Step 2: Create a test PDF blob (minimal PDF)
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Tesla Q4 2023 revenue increased) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
411
%%EOF`;

      const pdfBlob = new Blob([pdfContent], { type: "application/pdf" });
      const testFile = new File([pdfBlob], "test-doc.pdf", { type: "application/pdf" });

      // Step 3: Upload document
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("title", "Test RAG Document");
      formData.append("source", "test-suite");

      const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      assertEquals(uploadRes.status, 200, "Upload should succeed");
      const uploadData = await uploadRes.json();
      assertExists(uploadData.document_id, "Should return document_id");
      assertExists(uploadData.chunks, "Should return chunk count");
      assert(uploadData.chunks > 0, "Should have at least 1 chunk");

      // Wait for processing (simulated delay)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Query the document
      const queryRes = await fetch(`${SUPABASE_URL}/functions/v1/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: "What was Tesla's revenue trend?",
          k: 3,
        }),
      });

      assertEquals(queryRes.status, 200, "Query should succeed");
      const queryData = await queryRes.json();
      
      assertExists(queryData.answer, "Should return an answer");
      assertExists(queryData.sources, "Should return sources");
      assert(queryData.sources.length > 0, "Should have at least 1 source");
      assertExists(queryData.metrics, "Should return metrics");
      assert(queryData.metrics.totalLatency < 5000, "Should complete within 5s");
      
      // Verify source citations
      const firstSource = queryData.sources[0];
      assertExists(firstSource.label, "Source should have label");
      assertExists(firstSource.similarity, "Source should have similarity score");
      assert(firstSource.similarity > 0, "Similarity should be positive");

      console.log("✅ Full RAG workflow test passed!");
      console.log(`   - Uploaded: ${uploadData.chunks} chunks`);
      console.log(`   - Retrieved: ${queryData.sources.length} sources`);
      console.log(`   - Latency: ${queryData.metrics.totalLatency}ms`);

    } finally {
      // Cleanup: Delete test documents
      await supabase
        .from("documents")
        .delete()
        .eq("owner_id", userId)
        .eq("source", "test-suite");
    }
  },
});
