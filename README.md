Enterprise RAG System (Finance/Insurance Domain)

A production-grade Retrieval-Augmented Generation (RAG) platform for financial and insurance document analysis.
Built with Supabase + pgvector + LangChain + OpenAI embeddings, hardened with enterprise security.

🚀 Features

Secure Document Upload

Supports multi-format (PDF, TXT, HTML) up to 25MB

Sanitized filenames, client-side validation, RLS-protected storage

Smart Text Processing

PDF.js text extraction

Recursive chunking (1000 chars with 200 overlap)

Embeddings via text-embedding-3-small

Vector Search (pgvector)

IVFFlat indexes for sub-second retrieval

Hybrid search with metadata filters

Scalable to 500K+ chunks

Contextual AI Answers

RAG pipeline with top-k retrieval

Cited responses ([S1], [S2] format)

Real-time streaming ready

User Experience

Authenticated query history

Saved queries per user

Beta feedback collection system

Monitoring & Observability

Error logs (error_logs table)

Performance metrics (performance_metrics table)

Usage tracking (api_usage table)

Admin dashboards + alert-ready

Security Highlights

Row-Level Security (RLS) on all 12 tables

Zero public access (forced RLS + revoked grants)

Admin override policies

Dual rate limiting (per-user & per-IP)

Password complexity + leaked-password protection

🏗️ Architecture
User → Supabase Auth → Edge Functions
     ↳ process-document (upload → parse → chunk → embed → store)
     ↳ query (embed query → pgvector search → assemble prompt → LLM)
     ↳ feedback (collect ratings, log history)
     
PostgreSQL (Supabase)
├── documents
├── document_chunks
├── embeddings (vector(1536))
├── query_history
├── api_usage
├── error_logs
└── performance_metrics

⚡ Getting Started
1. Clone & Install
git clone https://github.com/yourusername/enterprise-rag.git
cd enterprise-rag
npm install

2. Environment Variables

Create .env file:

SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key

3. Database Setup

Run migrations in supabase/migrations/:

supabase db push

4. Start Edge Functions
supabase functions serve

5. Run Frontend (if included)
npm run dev

🔐 Security

Profiles → user can only see their own row (auth.uid() = id)

Documents/Chunks → owner-only + admin override

API Usage → users see sanitized history; admins see all

Analytics Views → no direct SELECT; admin-only RPC wrappers

Vector Extension → isolated in extensions schema

Passwords → leaked password protection + complexity enforced

📊 Performance

Processing: ~30s per 10-page PDF

Query latency: <2s (P95)

Similarity quality: >0.75 avg cosine

Load tested: 50–100 concurrent users, <2s P95

🛠️ Runbooks

LLM outage → fallback to cached responses

Vector DB degrade → reduce probes, fallback to last-known good

Cost spikes → tighten rate limiting, enable caching

Disaster recovery → Supabase PITR + S3 versioning

✅ Roadmap

 Multi-doc comparison queries

 Query result caching

 Admin analytics dashboard (Grafana integration)

 GDPR data export tool

 Mobile-friendly UI

📜 License

MIT — feel free to use for learning, but production deployments should review compliance (GDPR/CCPA) and adapt policies accordingly.
