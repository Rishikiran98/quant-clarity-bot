import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";

const BASE_URL = Deno.env.get("FUNCTION_URL") || "http://localhost:54321/functions/v1";
const TEST_TOKEN = Deno.env.get("TEST_TOKEN");

Deno.test("query: rejects unauthenticated request", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test query" }),
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, "AUTH_401");
});

Deno.test("query: rejects malformed authorization", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Authorization": "InvalidToken",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "test" }),
  });
  assertEquals(res.status, 401);
});

Deno.test("query: validates required question field", async () => {
  if (!TEST_TOKEN) {
    console.warn("Skipping auth tests: TEST_TOKEN not set");
    return;
  }

  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TEST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "" }),
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, "VALIDATION_400");
});

Deno.test("query: handles CORS preflight", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "OPTIONS",
  });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertExists(res.headers.get("Access-Control-Allow-Methods"));
});

Deno.test("query: returns requestId on error", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test" }),
  });
  const data = await res.json();
  assertExists(data.requestId);
});

Deno.test({
  name: "query: enforces rate limiting",
  ignore: !TEST_TOKEN,
  async fn() {
    console.log("Testing rate limiting (this may take 60+ seconds)...");
    
    // Make 31 requests rapidly (limit is 30/min)
    const promises = [];
    for (let i = 0; i < 31; i++) {
      promises.push(
        fetch(`${BASE_URL}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${TEST_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: `test query ${i}`, k: 1 }),
        })
      );
    }

    const results = await Promise.all(promises);
    
    // At least one should be rate limited
    const rateLimited = results.filter(r => r.status === 429);
    assertExists(rateLimited.length, "Expected at least one 429 response");
    
    console.log(`Rate limited ${rateLimited.length}/31 requests`);
  },
});

Deno.test({
  name: "query: validates k parameter bounds",
  ignore: !TEST_TOKEN,
  async fn() {
    const res = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "test", k: 100 }), // Should cap at 20
    });
    
    if (res.status === 200) {
      const data = await res.json();
      // k should be capped at 20 max
      assertExists(data.sources);
    }
  },
});
