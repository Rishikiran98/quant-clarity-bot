// deno-lint-ignore-file no-explicit-any
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";

const BASE_URL = "http://localhost:54321/functions/v1/query"; // adjust if different
const TEST_TOKEN = Deno.env.get("TEST_TOKEN"); // Optional

Deno.test("query: rejects unauthenticated request", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "hi" }),
  });

  const body = await res.json();
  assertEquals(body.error_code, "AUTH_401");
});

Deno.test("query: rejects malformed authorization", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "NotBearer token",
    },
    body: JSON.stringify({ question: "hi" }),
  });

  const body = await res.json();
  assertEquals(body.error_code, "AUTH_401");
});

Deno.test("query: validates required question field", async () => {
  if (!TEST_TOKEN) {
    console.log("Skipping auth tests: TEST_TOKEN not set");
    return;
  }

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${TEST_TOKEN}`,
    },
    body: JSON.stringify({}), // missing question
  });

  const body = await res.json();
  assertEquals(body.error_code, "VALIDATION_400");
});

Deno.test("query: handles CORS preflight", async () => {
  const res = await fetch(BASE_URL, { method: "OPTIONS" });
  assertEquals(res.status, 204);
});

Deno.test("query: returns requestId on error", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-json", // force JSON parse error
  });

  const body = await res.json();
  assertExists(body.requestId);
});
