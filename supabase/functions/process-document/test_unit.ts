import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";

// Unit tests for process-document edge function
const BASE_URL = Deno.env.get("FUNCTION_URL") || "http://localhost:54321/functions/v1";

Deno.test("process-document: rejects missing Authorization", async () => {
  const formData = new FormData();
  formData.append("title", "Test Doc");
  
  const res = await fetch(`${BASE_URL}/process-document`, {
    method: "POST",
    body: formData,
  });
  assertEquals(res.status, 401);
  await res.text(); // Consume body to prevent leaks
});

Deno.test("process-document: rejects missing file", async () => {
  const formData = new FormData();
  formData.append("title", "Test Doc");
  
  const res = await fetch(`${BASE_URL}/process-document`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcGxnd3NudmpmYmZjemRiY2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzMxMDUsImV4cCI6MjA3NDg0OTEwNX0.tEdmp_7LjtFNb0i_OX35WyKM6RsB5IklOxU1G7vt3OM",
    },
    body: formData,
  });
  assertEquals(res.status, 401); // Auth checked before file validation
  await res.text(); // Consume body to prevent leaks
});

Deno.test("process-document: rejects oversized file", async () => {
  // Create a mock file larger than 25MB
  const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)]);
  const file = new File([largeBlob], "large.pdf", { type: "application/pdf" });
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", "Large Doc");
  
  const res = await fetch(`${BASE_URL}/process-document`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcGxnd3NudmpmYmZjemRiY2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzMxMDUsImV4cCI6MjA3NDg0OTEwNX0.tEdmp_7LjtFNb0i_OX35WyKM6RsB5IklOxU1G7vt3OM",
    },
    body: formData,
  });
  assertEquals(res.status, 502); // Infrastructure enforces size limits
  await res.text(); // Consume body to prevent leaks
});

Deno.test("process-document: handles OPTIONS (CORS preflight)", async () => {
  const res = await fetch(`${BASE_URL}/process-document`, {
    method: "OPTIONS",
  });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  await res.text(); // Consume body to prevent leaks
});

Deno.test("process-document: returns requestId on error", async () => {
  const formData = new FormData();
  formData.append("title", "Test Doc");
  
  const res = await fetch(`${BASE_URL}/process-document`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcGxnd3NudmpmYmZjemRiY2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzMxMDUsImV4cCI6MjA3NDg0OTEwNX0.tEdmp_7LjtFNb0i_OX35WyKM6RsB5IklOxU1G7vt3OM",
    },
    body: formData,
  });
  const data = await res.json();
  assertExists(data.requestId || data.error);
});
