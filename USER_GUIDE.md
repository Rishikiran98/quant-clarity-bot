# Financial RAG System - User Guide

## Complete System Overhaul - What's New

Your system has been completely redesigned with proper role-based access control, improved database security, and enhanced query performance.

## User Roles & Access

### Admin Users
**Full system access including:**
- ✅ Performance metrics and system analytics
- ✅ Database management capabilities
- ✅ Advanced analytics (similarity heatmaps, drift monitoring)
- ✅ System architecture visualization
- ✅ All user features plus administrative tools
- ✅ Access to all uploaded documents across the system

### Regular Users
**Focused on document Q&A:**
- ✅ Upload and manage their own documents
- ✅ Ask questions and get AI-powered answers
- ✅ View source citations with similarity scores
- ✅ Download source documents directly
- ✅ Access query history
- ❌ No access to system metrics or other users' data

## How It Works

### For Regular Users

1. **Sign Up/Login**
   - Navigate to `/auth`
   - Create an account or sign in
   - You'll automatically be assigned the 'user' role

2. **Upload Documents**
   - Go to "My Documents" tab
   - Upload PDF financial documents
   - Documents are processed and embedded for semantic search

3. **Ask Questions**
   - Use the "Ask Questions" tab
   - Type your financial query
   - Get AI-generated answers with source citations
   - Download relevant source documents

4. **View History**
   - Access your past queries in "Query History"
   - Review answers and metrics

### For Admin Users

Admins get everything regular users have, PLUS:
- System performance dashboards
- Advanced analytics and visualizations
- Database management tools
- Access to all system documents

## Key Features

### ✅ Fixed Issues

1. **Database Access**
   - Users can now properly access their own documents
   - Row-level security (RLS) policies correctly implemented
   - Admins can see all data, users see only their data

2. **Query Responses**
   - Fixed authentication flow
   - Improved embedding generation
   - Better error handling and user feedback
   - Source document download functionality

3. **Model Performance**
   - Using Google Gemini 2.5 Flash for optimal balance
   - Improved context handling
   - Better re-ranking with keyword matching
   - Diversity-aware chunk selection

### 🔒 Security Improvements

- Proper role-based access control (RBAC)
- Server-side role validation
- User data isolation
- Secure document storage

### 🚀 Performance Enhancements

- Re-ranking algorithm for better results
- Keyword-aware retrieval
- Optimized similarity thresholds
- Better error messages

## Technical Details

### Database Structure
```
users (auth.users)
  ↓
user_roles (role: admin | moderator | user)
  ↓
profiles (user info)
  ↓
documents (uploaded PDFs)
  ↓
document_chunks (text chunks)
  ↓
embeddings (vector representations)
```

### Query Flow
1. User submits question
2. Generate embedding for question
3. Vector similarity search (retrieve top 30)
4. Re-rank with keyword matching + diversity (select top 12)
5. Filter by relevance threshold (>25% similarity)
6. Build context from relevant chunks
7. Generate answer using Gemini 2.5 Flash
8. Return answer + source citations + download links

## Troubleshooting

### "No documents found"
- Make sure you've uploaded documents
- Check that documents were successfully processed
- Verify you're logged in

### "No relevant information found"
- Try rephrasing your question
- Upload more documents on the topic
- Check if the question relates to uploaded content

### Admin features not showing
- Verify you have admin role assigned
- Contact system administrator to assign admin role
- Check user_roles table in database

## API Endpoints

### `/financial-rag-query`
- **Method**: POST
- **Auth**: Required (Bearer token)
- **Body**: `{ "query": "your question" }`
- **Response**: Answer + retrieved chunks + metadata

### Rate Limits
- 30 queries per minute per user
- Enforced at the database level

## Support

For issues or questions:
1. Check console logs for error details
2. Review query history for patterns
3. Contact administrator for role-related issues
4. Submit feedback through the feedback dialog

---

**Powered by Lovable AI** • Google Gemini 2.5 Flash
