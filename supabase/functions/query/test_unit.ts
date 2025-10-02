import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";

// Unit tests for query edge function
const BASE_URL = Deno.env.get("FUNCTION_URL") || "http://localhost:54321/functions/v1";

Deno.test("query: rejects missing Authorization", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test" }),
  });
  assertEquals(res.status, 401);
});

Deno.test("query: rejects malformed Authorization", async () => {
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

Deno.test("query: rejects empty question", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer mock-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "" }),
  });
  const data = await res.json();
  assertEquals(res.status, 400);
  assertExists(data.code);
  assertEquals(data.code, "VALIDATION_400");
});

Deno.test("query: handles OPTIONS (CORS preflight)", async () => {
  const res = await fetch(`${BASE_URL}/query`, {
    method: "OPTIONS",
  });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
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
