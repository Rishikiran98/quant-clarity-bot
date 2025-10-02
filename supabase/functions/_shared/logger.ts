/**
 * Shared logging utilities for edge functions
 * Provides consistent error and performance logging
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PerformanceMetrics {
  latency: number;
  chunks?: number;
  similarity?: number;
  llm?: number;
  db?: number;
  embedding?: number;
}

/**
 * Log errors to the error_logs table
 */
export async function logError(
  supabase: SupabaseClient,
  errorCode: string,
  message: string,
  req: Request,
  userId?: string
): Promise<void> {
  try {
    const url = new URL(req.url);
    
    await supabase.from("error_logs").insert({
      error_code: errorCode,
      error_message: message,
      request_id: crypto.randomUUID(),
      user_id: userId || null,
      endpoint: url.pathname,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0",
      user_agent: req.headers.get("user-agent") || "unknown",
    });
  } catch (err) {
    console.error("Failed to log error:", err);
  }
}

/**
 * Log performance metrics to the performance_metrics table
 */
export async function logPerformance(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  metrics: PerformanceMetrics
): Promise<void> {
  try {
    await supabase.from("performance_metrics").insert({
      endpoint,
      user_id: userId,
      latency_ms: Math.round(metrics.latency),
      chunks_retrieved: metrics.chunks || 0,
      avg_similarity: metrics.similarity ? Number(metrics.similarity.toFixed(4)) : null,
      llm_latency_ms: metrics.llm ? Math.round(metrics.llm) : null,
      db_latency_ms: metrics.db ? Math.round(metrics.db) : null,
    });
  } catch (err) {
    console.error("Failed to log performance:", err);
  }
}

/**
 * Log API usage for rate limiting
 */
export async function logApiUsage(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  req: Request
): Promise<void> {
  try {
    await supabase.from("api_usage").insert({
      user_id: userId,
      endpoint,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0",
    });
  } catch (err) {
    console.error("Failed to log API usage:", err);
  }
}

/**
 * Format error response with consistent structure
 */
export function errorResponse(
  code: string,
  message: string,
  requestId?: string,
  status = 400
): Response {
  return new Response(
    JSON.stringify({
      code,
      message,
      requestId: requestId || crypto.randomUUID(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

/**
 * Format success response with consistent structure
 */
export function successResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
