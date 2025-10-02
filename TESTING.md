# Testing Guide

## Overview
Comprehensive testing strategy for the Financial RAG system, covering unit, integration, and load testing.

---

## Test Structure

```
tests/
├── integration/
│   └── rag-workflow.test.ts       # Full workflow tests
├── k6-load.js                     # Load/stress testing
supabase/functions/
├── query/
│   └── test_unit.ts               # Query endpoint unit tests
└── process-document/
    └── test_unit.ts               # Document processing unit tests
```

---

## Unit Tests

### Running Unit Tests

```bash
# Test query endpoint
deno test --allow-net --allow-env supabase/functions/query/test_unit.ts

# Test process-document endpoint
deno test --allow-net --allow-env supabase/functions/process-document/test_unit.ts

# Run all unit tests
deno test --allow-net --allow-env supabase/functions/*/test_unit.ts
```

### Coverage

**Query Endpoint Tests:**
- ✅ Rejects missing Authorization header
- ✅ Rejects malformed Authorization
- ✅ Validates required fields (question)
- ✅ Handles CORS preflight (OPTIONS)
- ✅ Returns requestId on errors

**Process-Document Tests:**
- ✅ Rejects unauthorized requests
- ✅ Validates file presence
- ✅ Enforces file size limits (25MB)
- ✅ Handles CORS preflight
- ✅ Returns requestId/error info

### Expected Results
```
test query: rejects missing Authorization ... ok (45ms)
test query: rejects malformed Authorization ... ok (32ms)
test query: rejects empty question ... ok (28ms)
test query: handles OPTIONS ... ok (15ms)
test query: returns requestId on error ... ok (23ms)

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured
```

---

## Integration Tests

### Setup

Set required environment variables:
```bash
export RUN_INTEGRATION_TESTS=true
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
```

### Running Integration Tests

```bash
deno test --allow-net --allow-env tests/integration/rag-workflow.test.ts
```

### What It Tests

1. **User Authentication**
   - Creates test user
   - Signs in and obtains JWT

2. **Document Upload**
   - Uploads test PDF (minimal 1-page document)
   - Verifies document creation
   - Confirms chunking completed

3. **Document Processing**
   - Waits for embedding generation
   - Verifies chunks stored in database

4. **Query Execution**
   - Sends test query
   - Validates answer generation
   - Checks source citations
   - Verifies metrics returned

5. **Cleanup**
   - Deletes test documents
   - Removes test data

### Expected Output
```
✅ Full RAG workflow test passed!
   - Uploaded: 3 chunks
   - Retrieved: 2 sources
   - Latency: 1247ms

test result: ok. 1 passed; 0 failed; 0 ignored
```

---

## Load Testing with k6

### Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Running Load Tests

**Smoke Test** (5 VUs for 1 minute):
```bash
export TOKEN=your-jwt-token
export SUPABASE_URL=https://your-project.supabase.co
k6 run tests/k6-load.js
```

**Load Test** (50 VUs ramping):
```bash
# Uncomment the 'load' scenario in k6-load.js first
k6 run tests/k6-load.js
```

**Stress Test** (100 VUs):
```bash
k6 run --vus 100 --duration 3m tests/k6-load.js
```

### Performance Thresholds

The test enforces these SLAs:
- ✅ P95 latency < 2000ms
- ✅ Error rate < 2%
- ✅ Success rate > 98%

### Sample Output
```
scenarios: (100.00%) 1 scenario, 5 max VUs, 1m30s max duration
✓ status is 200
✓ has answer
✓ has sources
✓ latency < 2000ms
✓ latency < 5000ms

checks.........................: 100.00% ✓ 1500    ✗ 0
data_received..................: 2.1 MB  35 kB/s
data_sent......................: 421 kB  7.0 kB/s
http_req_blocked...............: avg=1.23ms   min=1µs     med=4µs      max=123ms   
http_req_duration..............: avg=847.32ms min=456ms   med=782ms    max=1.9s    
  { expected_response:true }...: avg=847.32ms min=456ms   med=782ms    max=1.9s    
http_reqs......................: 300     5/s
iteration_duration.............: avg=1.85s    min=1.46s   med=1.78s    max=2.93s   

✓ Checks............: 1500/1500
✓ Duration..........: 60.02s
✓ Requests..........: 300
✓ Request Rate.....: 5.00/s
✓ Success Rate.....: 100.00%
✓ Latency (p95)....: 1243.45ms
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main`

### Pipeline Stages

1. **Unit Tests** (always runs)
   - Tests both edge functions
   - Fast feedback (~30 seconds)

2. **Integration Tests** (main branch only)
   - Full RAG workflow test
   - Requires live Supabase instance
   - ~2-3 minutes

3. **Load Tests** (main branch only)
   - k6 smoke test (5 VUs, 1 min)
   - Validates performance SLAs
   - ~2 minutes

4. **Security Scan** (always runs)
   - Trivy vulnerability scanner
   - Checks dependencies
   - ~1 minute

5. **Deploy** (main branch, after all tests pass)
   - Automatic deployment
   - Health check verification
   - Production only

### Required Secrets

Configure in GitHub Settings → Secrets:
```
SUPABASE_URL              # Your Supabase project URL
SUPABASE_ANON_KEY         # Anon/public key
BETA_TEST_JWT             # Valid JWT for load testing
PRODUCTION_URL            # Production app URL for health checks
```

### Viewing Results

1. Go to repository → Actions tab
2. Select workflow run
3. View detailed logs for each job
4. Download artifacts (k6 results, test reports)

---

## Manual Testing Checklist

### Pre-Deployment Verification

- [ ] Unit tests pass locally
- [ ] Integration test completes successfully
- [ ] Load test meets SLA (P95 < 2s)
- [ ] No security vulnerabilities detected
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Rate limiting tested
- [ ] Error logging confirmed
- [ ] Metrics dashboard populated

### Smoke Test After Deployment

```bash
# 1. Test authentication
curl -X POST https://your-app.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 2. Test document upload
# (Use UI or Postman for file upload)

# 3. Test query
curl -X POST https://your-project.supabase.co/functions/v1/query \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the main risks?","k":5}'

# 4. Check system health
psql $DATABASE_URL -c "SELECT * FROM v_system_health;"
```

---

## Troubleshooting Tests

### Unit Tests Failing

**Error: Connection refused**
```bash
# Ensure FUNCTION_URL points to running instance
export FUNCTION_URL=http://localhost:54321/functions/v1
```

**Error: Unauthorized**
```bash
# Unit tests use mock tokens by design
# AUTH_401 errors are expected for auth tests
```

### Integration Tests Failing

**Error: RUN_INTEGRATION_TESTS not set**
```bash
export RUN_INTEGRATION_TESTS=true
```

**Error: User already exists**
```bash
# Delete test user from database
DELETE FROM auth.users WHERE email = 'test-rag@example.com';
```

**Error: No chunks retrieved**
- Wait longer for processing (increase sleep duration)
- Check edge function logs for processing errors
- Verify OpenAI API key configured

### k6 Load Tests Failing

**Error: TOKEN required**
```bash
# Obtain valid JWT token
export TOKEN=$(supabase auth login --email user@example.com --password pass)
```

**Error: Rate limit exceeded**
- Temporarily increase rate limits
- Reduce VUs or add more sleep time between requests
- Use different test users

**P95 latency threshold exceeded**
- Optimize database indexes
- Reduce chunk retrieval count
- Switch to faster LLM model
- Scale Supabase instance

---

## Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| Unit Tests | 100% | 100% |
| Edge Function Coverage | 80% | 90% |
| Integration Coverage | 70% | 85% |
| Load Test Scenarios | 1 | 3 |
| E2E User Flows | 1 | 3 |

---

## Future Enhancements

### Planned Tests
- [ ] Multi-user concurrent upload test
- [ ] Large document processing (100+ pages)
- [ ] Query caching effectiveness test
- [ ] Embedding quality regression test
- [ ] RLS policy penetration test
- [ ] Disaster recovery drill

### Test Infrastructure
- [ ] Dedicated test environment
- [ ] Test data seeding automation
- [ ] Visual regression testing
- [ ] Continuous load testing (24/7)
- [ ] Chaos engineering experiments

---

## Resources

- [Deno Testing Guide](https://deno.land/manual/testing)
- [k6 Documentation](https://k6.io/docs/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Supabase Testing Best Practices](https://supabase.com/docs/guides/testing)
