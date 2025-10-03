import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export const ReprocessDocuments = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReprocess = async () => {
    try {
      setIsProcessing(true);
      toast.loading("Reprocessing documents...");

      const { data, error } = await supabase.functions.invoke('reprocess-documents', {
        body: {}
      });

      if (error) throw error;

      toast.dismiss();
      
      if (data.processed > 0) {
        toast.success(`Successfully reprocessed ${data.processed} documents!`);
      } else {
        toast.info(data.message || "All documents already have embeddings");
      }

      console.log('Reprocess results:', data);
    } catch (error: any) {
      toast.dismiss();
      console.error('Reprocess error:', error);
      toast.error(error.message || "Failed to reprocess documents");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Reprocess Documents
        </CardTitle>
        <CardDescription>
          Generate embeddings for documents that were uploaded before the system was fully configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleReprocess} 
          disabled={isProcessing}
          className="w-full"
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
      </CardContent>
    </Card>
  );
};
