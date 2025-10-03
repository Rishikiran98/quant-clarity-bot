import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Shield,
  Search,
  Plus
} from 'lucide-react';
import URLScraper from './URLScraper';
import BulkURLScraper from './BulkURLScraper';
import { ReprocessDocuments } from './ReprocessDocuments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Validation constants and schema
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const uploadSchema = z.object({
  file: z.custom<File>(
    (f) => f instanceof File && f.size > 0,
    "File is required"
  ).refine(
    (f) => f.size <= MAX_FILE_SIZE,
    `File size must be less than 25MB`
  ).refine(
    (f) => ['application/pdf', 'text/plain', 'text/html', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(f.type),
    "File must be PDF, TXT, HTML, DOC, or DOCX"
  ),
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  source: z.string().trim().max(100, "Source must be less than 100 characters").optional()
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]/g, "_").slice(0, 128);
}

interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const DocumentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    content: '',
    source: '',
    file: null as File | null
  });

  useEffect(() => {
    checkAdminStatus();
    fetchDocuments();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive'
      });
      return;
    }

    setDocuments(data || []);
  };

  const handleFileUpload = async () => {
    if (!user || !isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can upload documents',
        variant: 'destructive'
      });
      return;
    }

    if (!newDoc.title || (!newDoc.content && !newDoc.file)) {
      toast({
        title: 'Validation Error',
        description: 'Title and either content or file are required',
        variant: 'destructive'
      });
      return;
    }

    // Validate file if provided
    if (newDoc.file) {
      try {
        uploadSchema.parse({
          file: newDoc.file,
          title: newDoc.title,
          source: newDoc.source || undefined
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: 'Validation Error',
            description: error.errors[0].message,
            variant: 'destructive'
          });
        }
        return;
      }
    }

    setUploading(true);

    try {
      let filePath = null;
      let fileSize = null;
      let mimeType = null;

      // Upload file to storage if provided
      if (newDoc.file) {
        const fileExt = newDoc.file.name.split('.').pop();
        const safeName = sanitizeFilename(newDoc.file.name.replace(/\.[^/.]+$/, ""));
        const fileName = `${safeName}_${Date.now()}.${fileExt}`;
        filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('financial-documents')
          .upload(filePath, newDoc.file);

        if (uploadError) {
          throw uploadError;
        }

        fileSize = newDoc.file.size;
        mimeType = newDoc.file.type;
      }

      // Insert document record with owner_id for RLS
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: newDoc.title,
          content: newDoc.content || `File: ${newDoc.file?.name}`,
          source: newDoc.source || 'Uploaded',
          file_path: filePath,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: user.id,
          owner_id: user.id // Set owner for RLS
        });

      if (insertError) {
        throw insertError;
      }

      // Get the inserted document ID
      const { data: insertedDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('title', newDoc.title)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (insertedDoc) {
        // Trigger background processing
        toast({
          title: 'Processing...',
          description: 'Document uploaded. Processing embeddings in background.'
        });

        // Call process-document edge function (non-blocking)
        supabase.functions
          .invoke('process-document', {
            body: { documentId: insertedDoc.id }
          })
          .then(({ data, error }) => {
            if (error) {
              console.error('Processing error:', error);
              toast({
                title: 'Processing Warning',
                description: 'Document uploaded but processing failed. Try re-uploading.',
                variant: 'destructive'
              });
            } else {
              toast({
                title: 'Success',
                description: `Document processed: ${data?.chunksProcessed || 0} chunks created`
              });
            }
          });
      }

      setNewDoc({ title: '', content: '', source: '', file: null });
      setIsDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (!isAdmin) {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete documents',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Delete file from storage if exists
      if (filePath) {
        await supabase.storage
          .from('financial-documents')
          .remove([filePath]);
      }

      // Delete document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document deleted'
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('financial-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <ReprocessDocuments />
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Document Management</h3>
            <p className="text-sm text-muted-foreground">
              {isAdmin && <Badge variant="outline" className="mt-1">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <BulkURLScraper onComplete={fetchDocuments} />
            <URLScraper onDocumentAdded={fetchDocuments} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-sm max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Financial Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the knowledge base
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Q3 2024 Financial Report"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., SEC Filing, Internal Report"
                    value={newDoc.source}
                    onChange={(e) => setNewDoc({ ...newDoc, source: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Text Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste document text or upload a file below"
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="file">File Upload (Optional)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: PDF, TXT, DOC, DOCX, HTML (Max 25MB)
                  </p>
                </div>
                <Button onClick={handleFileUpload} disabled={uploading} className="w-full">
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>No documents found</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg border border-border/50 bg-background/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{doc.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {doc.source}
                      </Badge>
                      {doc.file_path && (
                        <span>{formatFileSize(doc.file_size)}</span>
                      )}
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc.file_path!, doc.title)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id, doc.file_path)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {doc.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
    </div>
  );
};

export default DocumentManagement;
