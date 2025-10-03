import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Globe, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const URLScraper = ({ onDocumentAdded }: { onDocumentAdded: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isScrapin, setIsScrapin] = useState(false);

  const handleScrape = async () => {
    if (!user || !url) {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive'
      });
      return;
    }

    setIsScrapin(true);

    try {
      console.log('Starting scrape for URL:', url);
      
      // Fetch website content using a proxy to avoid CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      console.log('Fetching from proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      console.log('Proxy response received:', { hasContents: !!data.contents });
      
      if (!data.contents) {
        throw new Error('Failed to fetch website content');
      }

      // Parse HTML to extract text content
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // Remove script and style elements
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      
      // Extract text content
      const textContent = doc.body.textContent || '';
      const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

      // Extract title
      const title = doc.querySelector('title')?.textContent || new URL(url).hostname;

      if (cleanedContent.length < 100) {
        throw new Error('Insufficient content extracted from URL');
      }

      // Save to database
      console.log('Attempting to insert document:', { title, url, userId: user.id, contentLength: cleanedContent.length });
      
      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: title.substring(0, 200),
          content: cleanedContent.substring(0, 50000), // Limit to 50k chars
          source: url,
          owner_id: user.id,
          uploaded_by: user.id,
          mime_type: 'text/html'
        })
        .select()
        .single();

      console.log('Insert result:', { data: insertedDoc, error: insertError });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      toast({
        title: 'Processing...',
        description: 'Website scraped. Processing embeddings in background.'
      });

      // Trigger background processing
      supabase.functions
        .invoke('process-document', {
          body: { documentId: insertedDoc.id }
        })
        .then(({ error }) => {
          if (error) {
            console.error('Processing error:', error);
            toast({
              title: 'Processing Warning',
              description: 'Document saved but processing failed.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Success',
              description: 'Website content processed successfully!'
            });
          }
        });

      setUrl('');
      setIsOpen(false);
      onDocumentAdded();
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast({
        title: 'Scraping Failed',
        description: error.message || 'Failed to scrape website',
        variant: 'destructive'
      });
    } finally {
      setIsScrapin(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Globe className="h-4 w-4 mr-2" />
          Scrape URL
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Scrape Website Content</DialogTitle>
          <DialogDescription>
            Enter a URL to scrape and add to your knowledge base
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isScrapin}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter the URL of a financial article, report, or webpage
            </p>
          </div>
          <Button 
            onClick={handleScrape} 
            disabled={isScrapin || !url} 
            className="w-full"
          >
            {isScrapin ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Scrape Website
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default URLScraper;
