/**
 * k6 Load Test for RAG Query Endpoint
 * 
 * Usage:
 *   k6 run --env TOKEN=<jwt-token> tests/k6-load.js
 * 
 * Scenarios:
 *   - smoke: 5 VUs for 1m (sanity check)
 *   - load: 50 VUs for 2m (normal load)
 *   - stress: 100 VUs for 3m (stress test)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryLatency = new Trend('query_latency');
const embeddingLatency = new Trend('embedding_latency');
const dbLatency = new Trend('db_latency');
const llmLatency = new Trend('llm_latency');

// Configuration
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Uncomment for load testing:
    // load: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '30s', target: 50 },
    //     { duration: '2m', target: 50 },
    //     { duration: '30s', target: 0 },
    //   ],
    //   tags: { test_type: 'load' },
    // },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.02'],     // <2% error rate
    errors: ['rate<0.02'],
    query_latency: ['p(95)<2000'],
  },
};

// Test queries
const queries = [
  "What are the main risk factors for Tesla?",
  "Summarize the revenue trends in 2023",
  "What regulatory challenges does the company face?",
  "Describe the competitive landscape",
  "What are the key growth drivers?",
];

const BASE_URL = __ENV.SUPABASE_URL || 'https://xfplgwsnvjfbfczdbcft.supabase.co';
const TOKEN = __ENV.TOKEN;

export default function () {
  if (!TOKEN) {
    throw new Error('TOKEN environment variable is required');
  }

  // Select random query
  const question = queries[Math.floor(Math.random() * queries.length)];

  const payload = JSON.stringify({
    question,
    k: 5,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    timeout: '10s',
  };

  const response = http.post(`${BASE_URL}/functions/v1/query`, payload, params);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has answer': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.answer !== undefined;
      } catch {
        return false;
      }
    },
    'has sources': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.sources && body.sources.length > 0;
      } catch {
        return false;
      }
    },
    'latency < 2000ms': (r) => r.timings.duration < 2000,
    'latency < 5000ms': (r) => r.timings.duration < 5000,
  });

  // Record metrics
  errorRate.add(!success);
  queryLatency.add(response.timings.duration);

  // Parse detailed metrics if available
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      if (body.metrics) {
        if (body.metrics.embLatency) embeddingLatency.add(body.metrics.embLatency);
        if (body.metrics.dbLatency) dbLatency.add(body.metrics.dbLatency);
        if (body.metrics.llmLatency) llmLatency.add(body.metrics.llmLatency);
      }
    } catch (e) {
      console.error('Failed to parse metrics:', e);
    }
  }

  // Rate limiting: 1 request per second per VU
  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  
  return `
${indent}✓ Checks............: ${data.metrics.checks.values.passes}/${data.metrics.checks.values.passes + data.metrics.checks.values.fails}
${indent}✓ Duration..........: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s
${indent}✓ Requests..........: ${data.metrics.http_reqs.values.count}
${indent}✓ Request Rate.....: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
${indent}✓ Success Rate.....: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
${indent}✓ Latency (p95)....: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}✓ Query Latency....: ${data.metrics.query_latency ? data.metrics.query_latency.values['p(95)'].toFixed(2) : 'N/A'}ms
  `;
}
