/**
 * Integration test for full RAG workflow
 * Tests: Auth → Upload → Process → Query → Verify Results
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const TEST_EMAIL = "rag-test@example.com";
const TEST_PASSWORD = "TestRAG123!@#456";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ Skipping integration tests: missing SUPABASE_URL or SUPABASE_ANON_KEY");
  Deno.exit(0);
}

Deno.test({
  name: "RAG workflow: upload → process → query",
  ignore: !Deno.env.get("RUN_INTEGRATION_TESTS"),
  async fn() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log("Step 1: Creating test user...");
    
    // Try to sign up, ignore if user exists
    const { error: signUpError } = await supabase.auth.signUp({
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
    assertExists(authData.session, "Should have active session");

    const token = authData.session.access_token;
    const userId = authData.user.id;

    console.log(`Authenticated as user: ${userId}`);

    try {
      // Step 2: Load fixture PDF
      console.log("Step 2: Loading test PDF...");
      
      const pdfBytes = await Deno.readFile("tests/fixtures/sample.pdf");
      const testFile = new File([pdfBytes], "test-financial-doc.pdf", { type: "application/pdf" });

      // Step 3: Upload and process document
      console.log("Step 3: Uploading document...");
      
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("title", "Test Financial Document");

      const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (uploadRes.status !== 200) {
        const errorBody = await uploadRes.text();
        console.error(`Upload failed with status ${uploadRes.status}:`, errorBody);
      }
      assertEquals(uploadRes.status, 200, "Upload should succeed");
      const uploadData = await uploadRes.json();
      
      console.log(`Upload response:`, uploadData);
      
      assertExists(uploadData.document_id, "Should return document_id");
      assertExists(uploadData.chunks, "Should return chunk count");
      assert(uploadData.chunks > 0, "Should have at least 1 chunk");

      console.log(`✓ Document uploaded: ${uploadData.chunks} chunks, ${uploadData.pages} pages`);

      // Wait for processing to complete
      console.log("Step 4: Waiting for processing (3s)...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 5: Query the document
      console.log("Step 5: Querying document...");
      
      const queryRes = await fetch(`${SUPABASE_URL}/functions/v1/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: "What was Tesla's Q4 2023 revenue growth?",
          k: 3,
        }),
      });

      assertEquals(queryRes.status, 200, "Query should succeed");
      const queryData = await queryRes.json();
      
      console.log(`Query response:`, queryData);
      
      assertExists(queryData.answer, "Should return an answer");
      assertExists(queryData.sources, "Should return sources");
      assert(queryData.sources.length > 0, "Should have at least 1 source");
      assertExists(queryData.metrics, "Should return metrics");
      assert(queryData.metrics.totalLatency < 10000, "Should complete within 10s");
      
      // Verify source quality
      const firstSource = queryData.sources[0];
      assertExists(firstSource.label, "Source should have label");
      assertExists(firstSource.similarity, "Source should have similarity score");
      assert(firstSource.similarity > 0, "Similarity should be positive");
      assert(firstSource.similarity <= 1, "Similarity should be <= 1");

      console.log("✅ Full RAG workflow test PASSED!");
      console.log(`   - Document: ${uploadData.document_id}`);
      console.log(`   - Chunks uploaded: ${uploadData.chunks}`);
      console.log(`   - Sources retrieved: ${queryData.sources.length}`);
      console.log(`   - Top similarity: ${(firstSource.similarity * 100).toFixed(1)}%`);
      console.log(`   - Total latency: ${queryData.metrics.totalLatency}ms`);

    } finally {
      // Cleanup: Delete test documents
      console.log("Cleanup: Removing test documents...");
      
      const { error: cleanupError } = await supabase
        .from("documents")
        .delete()
        .eq("owner_id", userId)
        .eq("title", "Test Financial Document");
      
      if (cleanupError) {
        console.warn("Cleanup warning:", cleanupError.message);
      }
    }
  },
});

Deno.test({
  name: "RAG workflow: handles invalid PDF gracefully",
  ignore: !Deno.env.get("RUN_INTEGRATION_TESTS"),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: authData } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (!authData?.session) {
      console.warn("Skipping test: not authenticated");
      return;
    }

    const token = authData.session.access_token;

    // Create an invalid/empty PDF
    const invalidPdf = new Blob(["Not a real PDF"], { type: "application/pdf" });
    const file = new File([invalidPdf], "invalid.pdf", { type: "application/pdf" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", "Invalid PDF Test");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });

    // Should return 400 (client error) for invalid PDF
    assertEquals(res.status, 400, "Should return 400 for invalid PDF");
    
    const data = await res.json();
    assertExists(data.code, "Should have error code");
    assertEquals(data.code, "PDF_PARSE_400", "Should return PDF_PARSE_400 code");
    assertExists(data.message, "Should have error message");
    
    console.log(`✓ Invalid PDF handled gracefully with 400: ${data.code}`);
  },
});
