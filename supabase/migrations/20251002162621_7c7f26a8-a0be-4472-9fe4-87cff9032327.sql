-- Create storage bucket for financial documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-documents',
  'financial-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- Add file_path column to documents table to link to storage
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;