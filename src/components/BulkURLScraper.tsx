import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Globe, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const FINANCIAL_URLS = [
  // Stock Analysis & Valuation
  { url: 'https://www.investopedia.com/terms/p/price-earningsratio.asp', title: 'P/E Ratio', category: 'Stock Analysis' },
  { url: 'https://www.investopedia.com/terms/p/pegratio.asp', title: 'PEG Ratio', category: 'Stock Analysis' },
  { url: 'https://www.investopedia.com/terms/r/returnonequity.asp', title: 'Return on Equity', category: 'Stock Analysis' },
  { url: 'https://www.investopedia.com/terms/r/returnonassets.asp', title: 'Return on Assets', category: 'Stock Analysis' },
  { url: 'https://www.investopedia.com/terms/d/debtequityratio.asp', title: 'Debt-to-Equity Ratio', category: 'Stock Analysis' },
  
  // Financial Statements
  { url: 'https://www.investopedia.com/terms/b/balancesheet.asp', title: 'Balance Sheet', category: 'Financial Statements' },
  { url: 'https://www.investopedia.com/terms/i/incomestatement.asp', title: 'Income Statement', category: 'Financial Statements' },
  { url: 'https://www.investopedia.com/terms/c/cashflowstatement.asp', title: 'Cash Flow Statement', category: 'Financial Statements' },
  { url: 'https://www.investopedia.com/terms/w/workingcapital.asp', title: 'Working Capital', category: 'Financial Statements' },
  
  // Investment Strategies
  { url: 'https://www.investopedia.com/terms/v/valueinvesting.asp', title: 'Value Investing', category: 'Investment Strategies' },
  { url: 'https://www.investopedia.com/terms/g/growthinvesting.asp', title: 'Growth Investing', category: 'Investment Strategies' },
  { url: 'https://www.investopedia.com/terms/d/diversification.asp', title: 'Diversification', category: 'Investment Strategies' },
  { url: 'https://www.investopedia.com/terms/a/assetallocation.asp', title: 'Asset Allocation', category: 'Investment Strategies' },
  
  // Corporate Finance
  { url: 'https://www.investopedia.com/terms/c/costofcapital.asp', title: 'Cost of Capital', category: 'Corporate Finance' },
  { url: 'https://www.investopedia.com/terms/w/wacc.asp', title: 'WACC', category: 'Corporate Finance' },
  { url: 'https://www.investopedia.com/terms/n/npv.asp', title: 'NPV', category: 'Corporate Finance' },
  { url: 'https://www.investopedia.com/terms/i/irr.asp', title: 'IRR', category: 'Corporate Finance' },
  
  // Risk Management
  { url: 'https://www.investopedia.com/terms/b/beta.asp', title: 'Beta', category: 'Risk Management' },
  { url: 'https://www.investopedia.com/terms/v/var.asp', title: 'Value at Risk', category: 'Risk Management' },
  { url: 'https://www.investopedia.com/terms/s/sharperatio.asp', title: 'Sharpe Ratio', category: 'Risk Management' },
];

interface ScrapeResult {
  url: string;
  title: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const BulkURLScraper = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrapin, setIsScrapin] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [progress, setProgress] = useState(0);

  const scrapeURL = async (url: string, title: string): Promise<boolean> => {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) throw new Error('Failed to fetch content');

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      
      const textContent = doc.body.textContent || '';
      const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

      if (cleanedContent.length < 100) throw new Error('Insufficient content');

      const { data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: title.substring(0, 200),
          content: cleanedContent.substring(0, 50000),
          source: url,
          owner_id: user!.id,
          uploaded_by: user!.id,
          mime_type: 'text/html'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger background processing (non-blocking)
      supabase.functions.invoke('process-document', {
        body: { documentId: insertedDoc.id }
      });

      return true;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return false;
    }
  };

  const handleBulkScrape = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive'
      });
      return;
    }

    setIsScrapin(true);
    setProgress(0);
    
    const initialResults: ScrapeResult[] = FINANCIAL_URLS.map(item => ({
      url: item.url,
      title: item.title,
      status: 'pending'
    }));
    setResults(initialResults);

    let completed = 0;
    const total = FINANCIAL_URLS.length;

    for (let i = 0; i < FINANCIAL_URLS.length; i++) {
      const item = FINANCIAL_URLS[i];
      
      const success = await scrapeURL(item.url, item.title);
      completed++;
      
      setResults(prev => prev.map((r, idx) => 
        idx === i 
          ? { ...r, status: success ? 'success' : 'error', error: success ? undefined : 'Failed to scrape' }
          : r
      ));
      
      setProgress((completed / total) * 100);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsScrapin(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    toast({
      title: 'Bulk Scrape Complete',
      description: `Successfully scraped ${successCount} of ${total} URLs. Processing embeddings in background.`
    });

    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Globe className="h-4 w-4 mr-2" />
          Bulk Import Financial Data
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-sm max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Financial Knowledge</DialogTitle>
          <DialogDescription>
            Import {FINANCIAL_URLS.length} financial concepts from Investopedia
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isScrapin && results.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This will automatically scrape and import:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>5 Stock Analysis metrics (P/E, ROE, etc.)</li>
                <li>4 Financial Statement concepts</li>
                <li>4 Investment Strategies</li>
                <li>4 Corporate Finance topics</li>
                <li>3 Risk Management concepts</li>
              </ul>
              <p className="text-xs mt-3">⏱️ Estimated time: ~2-3 minutes</p>
            </div>
          )}

          {isScrapin && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-background/50 text-sm"
                  >
                    <span className="flex-1 truncate">{result.title}</span>
                    {result.status === 'pending' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {result.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Button 
            onClick={handleBulkScrape} 
            disabled={isScrapin} 
            className="w-full"
          >
            {isScrapin ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scraping {FINANCIAL_URLS.length} URLs...
              </>
            ) : results.length > 0 ? (
              'Scrape Again'
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Start Bulk Import
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkURLScraper;
