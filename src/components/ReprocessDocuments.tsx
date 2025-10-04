import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

export const ReprocessDocuments = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const MAX_RETRIES = 3;

  const processWithRetry = async (attempt = 1): Promise<any> => {
    try {
      setProgress(20);
      
      const { data, error } = await supabase.functions.invoke('reprocess-documents', {
        body: {}
      });

      setProgress(80);

      if (error) {
        // Check for specific error types
        if (error.message?.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection.');
        }
        throw error;
      }

      setProgress(100);
      return data;
    } catch (error: any) {
      // Retry logic for transient errors
      if (attempt < MAX_RETRIES && 
          (error.message?.includes('network') || error.message?.includes('timeout'))) {
        setRetryCount(attempt);
        toast({
          title: "Retrying...",
          description: `Attempt ${attempt + 1} of ${MAX_RETRIES}`,
        });
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return processWithRetry(attempt + 1);
      }
      
      throw error;
    }
  };

  const handleReprocess = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setRetryCount(0);

      toast({
        title: "Processing Started",
        description: "Reprocessing documents with improved chunking algorithm...",
      });

      const data = await processWithRetry();

      if (data.processed > 0) {
        toast({
          title: "Success!",
          description: (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reprocessed {data.processed} of {data.total} documents</p>
                {data.failed > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.failed} document{data.failed > 1 ? 's' : ''} failed - check console for details
                  </p>
                )}
              </div>
            </div>
          ),
        });

        // Log detailed results for debugging
        if (data.results) {
          console.log('Reprocess details:', data.results);
        }
      } else {
        toast({
          title: "No Documents Found",
          description: data.message || "All documents are up to date",
        });
      }
    } catch (error: any) {
      console.error('Reprocess error:', error);
      
      const errorMessage = error.message || "Failed to reprocess documents";
      
      toast({
        title: "Processing Failed",
        description: (
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p>{errorMessage}</p>
              {retryCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Failed after {retryCount + 1} attempt{retryCount > 0 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setRetryCount(0);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Reprocess Documents
        </CardTitle>
        <CardDescription>
          Regenerate all document chunks with improved sentence-boundary chunking for better retrieval quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempt {retryCount} of {MAX_RETRIES}
              </p>
            )}
          </div>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={isProcessing}
              className="w-full"
              variant="outline"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reprocess All Documents
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card/95 backdrop-blur-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Reprocess All Documents?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This will delete and regenerate all document chunks with the improved semantic chunking algorithm.
                </p>
                <p className="font-semibold text-foreground">
                  This process may take several minutes depending on the number of documents.
                </p>
                <p className="text-muted-foreground text-sm">
                  Note: Existing queries will continue to work during processing.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReprocess}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};