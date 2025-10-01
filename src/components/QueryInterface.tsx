import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);
  const [answer, setAnswer] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      // Call the real edge function
      const response = await fetch(
        'https://xfplgwsnvjfbfczdbcft.supabase.co/functions/v1/financial-rag-query',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process query');
      }

      const data = await response.json();
      
      setRetrievedChunks(data.retrievedChunks);
      setAnswer(data.answer);
      setShowResults(true);
      
      // Add to history
      const avgSimilarity = data.retrievedChunks.reduce((sum: number, chunk: any) => 
        sum + chunk.similarity, 0) / data.retrievedChunks.length;
      
      if ((window as any).addToQueryHistory) {
        (window as any).addToQueryHistory(query, data.retrievedChunks.length, avgSimilarity);
      }
      
      toast({
        title: "Query Processed",
        description: `Retrieved ${data.retrievedChunks.length} relevant documents`,
      });
    } catch (error) {
      console.error('Query error:', error);
      toast({
        title: "Query Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" />
            Query Interface
          </h2>
          <p className="text-muted-foreground">
            Ask questions about financial filings, earnings reports, or insurance risk disclosures
          </p>
        </div>

        <Card className="p-6 mb-6 border-primary/20 bg-gradient-to-br from-card to-card/50">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your financial or insurance-related query..."
            className="min-h-[120px] mb-4 bg-background/50 border-border"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Try:</span>
            {exampleQueries.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setQuery(example)}
                className="text-xs"
              >
                {example.slice(0, 40)}...
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
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
