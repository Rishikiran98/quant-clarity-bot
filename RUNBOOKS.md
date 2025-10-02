# Operations Runbooks

## Overview
This document contains step-by-step procedures for handling common operational issues with the Financial RAG system.

---

## 1. LLM Provider Outage

### Symptoms
- `LLM_FAIL` error code spike in `error_logs` table
- User reports of "AI generation failed" errors
- Query endpoint returning 500 errors

### Diagnosis
```sql
-- Check recent LLM errors
SELECT COUNT(*), error_message 
FROM error_logs 
WHERE error_code = 'LLM_FAIL' 
  AND ts > now() - interval '5 minutes'
GROUP BY error_message;
```

### Actions

1. **Immediate Response** (within 5 minutes)
   - Post status banner in UI: "AI service experiencing issues. We're working on it."
   - Enable cached answers for top 20 queries (if implemented)
   - Switch to backup model in Lovable AI gateway

2. **Failover** (if issue persists > 10 minutes)
   ```typescript
   // Update edge function to use alternative model
   // In query/index.ts, change:
   model: "google/gemini-2.5-flash"  // Primary
   // To:
   model: "google/gemini-2.5-flash-lite"  // Faster fallback
   ```

3. **Recovery Verification**
   ```bash
   # Run smoke test
   k6 run --vus 5 --duration 1m tests/k6-load.js
   
   # Check error rate
   SELECT COUNT(*) FROM error_logs 
   WHERE error_code = 'LLM_FAIL' 
     AND ts > now() - interval '5 minutes';
   ```

4. **Post-Incident**
   - Remove status banner
   - Restore primary model
   - Document incident timeline
   - Review retry logic

---

## 2. Vector Database Performance Degradation

### Symptoms
- `db_latency_ms` > 1200ms in performance_metrics
- Low chunk retrieval counts (< 2 chunks avg)
- Slow query responses (> 3s total)

### Diagnosis
```sql
-- Check DB performance
SELECT 
  AVG(db_latency_ms) as avg_db_ms,
  AVG(chunks_retrieved) as avg_chunks,
  COUNT(*) as queries
FROM performance_metrics
WHERE ts > now() - interval '10 minutes';

-- Check index health
SELECT 
  schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE tablename = 'embeddings';
```

### Actions

1. **Quick Wins** (< 5 minutes)
   ```sql
   -- Reduce IVFFlat probe count (faster, slightly less accurate)
   SET ivfflat.probes = 5;  -- Down from default 10
   
   -- Update statistics
   ANALYZE embeddings;
   ANALYZE document_chunks;
   ```

2. **Application-Level Tuning**
   ```typescript
   // In query/index.ts, reduce top-k temporarily
   const k: number = Math.min(Number(body?.k ?? 3), 10);  // Reduced from 5
   ```

3. **Index Optimization** (if > 500K vectors)
   ```sql
   -- Consider switching to HNSW for better performance
   -- WARNING: This is a blocking operation, schedule during low traffic
   
   DROP INDEX IF EXISTS idx_embeddings_cosine;
   
   CREATE INDEX idx_embeddings_hnsw ON embeddings 
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   
   ANALYZE embeddings;
   ```

4. **Monitoring Recovery**
   ```sql
   -- Watch metrics improve
   SELECT 
     date_trunc('minute', ts) as minute,
     AVG(db_latency_ms)::integer as avg_db_ms,
     PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY db_latency_ms) as p95_db_ms
   FROM performance_metrics
   WHERE ts > now() - interval '30 minutes'
   GROUP BY 1
   ORDER BY 1 DESC
   LIMIT 10;
   ```

---

## 3. Cost Spike

### Symptoms
- Unexpected increase in Lovable AI usage costs
- High volume of API calls in short period
- Budget alert triggered

### Diagnosis
```sql
-- Check request volume
SELECT * FROM v_cost_summary ORDER BY day DESC LIMIT 7;

-- Identify heavy users
SELECT 
  user_id,
  COUNT(*) as queries,
  AVG(chunks_retrieved) as avg_chunks
FROM performance_metrics
WHERE ts > now() - interval '24 hours'
GROUP BY user_id
ORDER BY queries DESC
LIMIT 10;

-- Check for abuse patterns
SELECT 
  ip_address,
  COUNT(*) as requests,
  COUNT(DISTINCT user_id) as users
FROM api_usage
WHERE ts > now() - interval '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 100
ORDER BY requests DESC;
```

### Actions

1. **Immediate Cost Control** (< 10 minutes)
   ```sql
   -- Tighten rate limits
   -- Update in edge function: RATE_LIMIT = 15 (down from 30)
   
   -- Block abusive IPs temporarily
   -- Add to edge function IP blocklist
   ```

2. **Enable Caching** (if not already implemented)
   ```typescript
   // Cache frequent queries in memory or Redis
   const cacheKey = `query:${hashQuery(question)}`;
   const cached = await cache.get(cacheKey);
   if (cached) return cached;
   ```

3. **Model Optimization**
   - Switch from `google/gemini-2.5-flash` to `google/gemini-2.5-flash-lite`
   - Reduce max tokens in LLM calls
   - Decrease embedding batch sizes

4. **User Communication**
   - Notify users of temporary rate limit reductions
   - Identify and contact heavy users
   - Review pricing tier assignments

---

## 4. Database Restore Procedure

### When to Use
- Data corruption detected
- Accidental bulk deletion
- Security incident requiring rollback
- Failed migration needs reversal

### Prerequisites
- Admin access to Lovable Cloud dashboard
- Restore point identifier or timestamp
- Maintenance window scheduled (15-30 min)

### Procedure

1. **Pre-Restore Checklist**
   ```bash
   # Document current state
   - Current timestamp: [____]
   - Issue description: [____]
   - Affected tables: [____]
   - Restore target time: [____]
   
   # Notify stakeholders
   - Post maintenance banner in UI
   - Send email to active users
   - Alert on-call team
   ```

2. **Perform Restore via Lovable Cloud**
   ```
   1. Go to Backend → Database
   2. Navigate to Backups section
   3. Select restore point (PITR available)
   4. Confirm target timestamp
   5. Initiate restore (15-20 min process)
   6. Wait for completion notification
   ```

3. **Verify Data Integrity**
   ```sql
   -- Check row counts
   SELECT 
     'documents' as table, COUNT(*) as count FROM documents
   UNION ALL
   SELECT 'document_chunks', COUNT(*) FROM document_chunks
   UNION ALL
   SELECT 'embeddings', COUNT(*) FROM embeddings
   UNION ALL
   SELECT 'query_history', COUNT(*) FROM query_history;
   
   -- Sample recent data
   SELECT * FROM documents ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM query_history ORDER BY created_at DESC LIMIT 5;
   ```

4. **Run Smoke Tests**
   ```bash
   # Test query endpoint
   export RUN_INTEGRATION_TESTS=true
   deno test tests/integration/rag-workflow.test.ts
   
   # Light load test
   k6 run --vus 5 --duration 30s tests/k6-load.js
   ```

5. **Post-Restore**
   - Remove maintenance banner
   - Document restore timeline
   - Verify all services healthy
   - Monitor error rates for 1 hour

---

## 5. High Error Rate Alert

### Symptoms
- Error rate > 2% in last 5 minutes
- Multiple error codes appearing
- User complaints in support channels

### Diagnosis
```sql
-- Check error distribution
SELECT * FROM v_error_summary ORDER BY minute DESC LIMIT 20;

-- Identify most common errors
SELECT 
  error_code,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users,
  MIN(error_message) as sample_message
FROM error_logs
WHERE ts > now() - interval '15 minutes'
GROUP BY error_code
ORDER BY occurrences DESC;

-- Check system health
SELECT * FROM v_system_health;
```

### Actions by Error Code

**AUTH_401 Spike**
- Check Supabase auth service status
- Verify JWT expiration logic
- Review recent auth config changes

**RATE_429 Spike**
- Check if legitimate traffic spike or attack
- Review rate limit thresholds
- Consider scaling rate limits temporarily

**EMBED_500 / LLM_500**
- Follow LLM Provider Outage runbook
- Check OpenAI API status
- Verify API keys valid

**VECTOR_SEARCH_FAIL**
- Follow Vector Database Degradation runbook
- Check database connections
- Verify RLS policies not blocking

**UNCAUGHT_500**
- Review recent code deployments
- Check edge function logs
- Rollback if recent deployment

---

## 6. Emergency Contacts

### Escalation Path
1. **L1 Support**: Check runbooks, attempt standard fixes (you are here)
2. **L2 Engineering**: Complex issues, code changes needed
3. **L3 Architecture**: System redesign, major incidents

### Key Services Status Pages
- Lovable Cloud: https://status.lovable.dev
- OpenAI: https://status.openai.com
- Supabase: https://status.supabase.com

### Monitoring & Alerting
- Metrics Dashboard: [Backend → Analytics]
- Error Logs: [Backend → Database → error_logs table]
- System Health: [Backend → Database → v_system_health view]

---

## 7. Routine Maintenance

### Weekly Tasks
```sql
-- Clean old logs (keep 30 days)
DELETE FROM error_logs WHERE ts < now() - interval '30 days';
DELETE FROM performance_metrics WHERE ts < now() - interval '30 days';
DELETE FROM api_usage WHERE ts < now() - interval '30 days';

-- Update table statistics
ANALYZE documents;
ANALYZE document_chunks;
ANALYZE embeddings;
ANALYZE query_history;
```

### Monthly Tasks
- Review cost trends (v_cost_summary)
- Check index bloat and reindex if needed
- Review and archive old query_history
- Update runbooks based on incidents
- Test restore procedure (quarterly)

### Quarterly Tasks
- Load test with realistic data (100 VUs)
- Security audit of RLS policies
- Review and optimize edge functions
- Update dependencies and libraries

---

## Appendix: Useful SQL Queries

### Top Users by Query Volume
```sql
SELECT 
  u.email,
  COUNT(*) as queries,
  AVG(pm.latency_ms)::integer as avg_latency,
  AVG(pm.avg_similarity)::numeric(5,4) as avg_similarity
FROM performance_metrics pm
JOIN auth.users u ON u.id = pm.user_id
WHERE pm.ts > now() - interval '7 days'
GROUP BY u.email
ORDER BY queries DESC
LIMIT 20;
```

### Slowest Queries
```sql
SELECT 
  endpoint,
  latency_ms,
  chunks_retrieved,
  avg_similarity,
  ts
FROM performance_metrics
WHERE ts > now() - interval '24 hours'
ORDER BY latency_ms DESC
LIMIT 10;
```

### Error Spike Detection
```sql
SELECT 
  date_trunc('minute', ts) as minute,
  COUNT(*) as errors
FROM error_logs
WHERE ts > now() - interval '1 hour'
GROUP BY 1
HAVING COUNT(*) > 5
ORDER BY 1 DESC;
```
