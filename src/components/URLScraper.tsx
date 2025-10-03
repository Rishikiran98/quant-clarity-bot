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
      
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { url }
      });

      console.log('Scrape response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Failed to scrape URL');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to scrape URL');
      }

      toast({
        title: 'Success',
        description: `Website scraped successfully! Processing ${data.contentLength} characters.`
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
