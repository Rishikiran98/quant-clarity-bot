import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RetrievalVisualization from "./RetrievalVisualization";
import AnswerDisplay from "./AnswerDisplay";

const exampleQueries = [
  "What are the key risk factors disclosed in Tesla's latest 10-K filing?",
  "Summarize Apple's revenue growth trends from recent earnings reports",
  "What insurance risks does Progressive report regarding climate change?",
];

interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  similarity: number;
  metadata: {
    ticker: string;
    fiscal_year: number;
    category: string;
  };
}

const MAX_QUERY_LENGTH = 500;

const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);
  const [answer, setAnswer] = useState("");
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user has documents
  React.useEffect(() => {
    const checkDocuments = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true });
        
        setHasDocuments(!error && (data?.length ?? 0) > 0);
      } catch (error) {
        console.error('Error checking documents:', error);
        setHasDocuments(false);
      }
    };
    
    checkDocuments();
  }, [user]);

  const handleSubmit = async () => {
    // Input validation
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      toast({
        title: "Empty Query",
        description: "Please enter a question to search your documents.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      toast({
        title: "Query Too Long",
        description: `Please keep your query under ${MAX_QUERY_LENGTH} characters (currently ${trimmedQuery.length}).`,
        variant: "destructive",
      });
      return;
    }

    if (hasDocuments === false) {
      toast({
        title: "No Documents",
        description: "Please upload documents to the knowledge base before querying.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to submit queries.",
          variant: "destructive",
        });
        return;
      }

      // Call the edge function with authentication
      const { data, error } = await supabase.functions.invoke('financial-rag-query', {
        body: { query: trimmedQuery }
      });

      if (error) {
        // Handle specific error types
        if (error.message?.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (error.message?.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else {
          throw new Error(error.message || 'Failed to process query. Please try again.');
        }
      }

      if (!data) {
        throw new Error('No response received. Please try again.');
      }

      const chunks = data.retrievedChunks || [];
      const responseAnswer = data.answer || 'No answer generated.';

      setRetrievedChunks(chunks);
      setAnswer(responseAnswer);
      setShowResults(true);
      
      // Save to database (non-blocking)
      if (user && chunks.length > 0) {
        const avgSimilarity = chunks.reduce((sum: number, chunk: any) => 
          sum + chunk.similarity, 0) / chunks.length;
        
        supabase.from('query_history').insert({
          user_id: user.id,
          query: trimmedQuery,
          documents_retrieved: chunks.length,
          avg_similarity: avgSimilarity,
          answer: responseAnswer
        }).then(({ error }) => {
          if (error) console.error('Failed to save query history:', error);
        });
      }
      
      toast({
        title: "Query Processed",
        description: chunks.length > 0 
          ? `Retrieved ${chunks.length} relevant document${chunks.length > 1 ? 's' : ''}`
          : "Search complete - no highly relevant documents found",
      });
    } catch (error) {
      console.error('Query error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Something went wrong. Please try again.";
      
      toast({
        title: "Query Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show empty state if no documents
  if (hasDocuments === false) {
    return (
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center border-dashed border-2 border-border bg-gradient-to-br from-card/50 to-background">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Documents in Knowledge Base</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Upload financial documents, reports, or filings to start asking questions and get AI-powered insights.
              </p>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-left p-4 rounded-lg bg-background/50 border border-border/50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-primary">1.</span> Upload Documents
                </h3>
                <p className="text-sm text-muted-foreground">
                  Go to the "Documents" tab and upload PDFs, financial reports, or paste text content.
                </p>
              </div>
              
              <div className="text-left p-4 rounded-lg bg-background/50 border border-border/50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-primary">2.</span> Wait for Processing
                </h3>
                <p className="text-sm text-muted-foreground">
                  Documents are automatically processed and indexed for semantic search.
                </p>
              </div>
              
              <div className="text-left p-4 rounded-lg bg-background/50 border border-border/50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-primary">3.</span> Ask Questions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Return here to query your documents with natural language questions.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground mb-3">Example questions you'll be able to ask:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {exampleQueries.map((example, idx) => (
                  <div
                    key={idx}
                    className="text-xs px-3 py-2 rounded-md bg-muted/50 border border-border/50 max-w-xs"
                  >
                    "{example.slice(0, 50)}..."
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" />
            Query Interface
          </h2>
          <p className="text-muted-foreground">
            Ask questions about your uploaded financial documents and get AI-powered insights
          </p>
        </div>

        <Card className="p-6 mb-6 border-primary/20 bg-gradient-to-br from-card to-card/50">
          <Textarea
            value={query}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= MAX_QUERY_LENGTH) {
                setQuery(newValue);
              }
            }}
            placeholder="Enter your question... (e.g., What are the main revenue drivers? What risks are disclosed?)"
            className="min-h-[120px] mb-2 bg-background/50 border-border"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-muted-foreground">
              {query.length}/{MAX_QUERY_LENGTH} characters
              {query.length > MAX_QUERY_LENGTH * 0.9 && query.length < MAX_QUERY_LENGTH && (
                <span className="text-yellow-500 ml-2">• Approaching limit</span>
              )}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Try:</span>
            {exampleQueries.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setQuery(example)}
                className="text-xs"
                disabled={isLoading}
              >
                {example.slice(0, 40)}...
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim() || query.length > MAX_QUERY_LENGTH}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Query...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze with RAG Pipeline
              </>
            )}
          </Button>
        </Card>

        {showResults && (
          <div className="grid md:grid-cols-2 gap-6">
            <RetrievalVisualization chunks={retrievedChunks} />
            <AnswerDisplay answer={answer} chunksCount={retrievedChunks.length} />
          </div>
        )}
      </div>
    </section>
  );
};

export default QueryInterface;
