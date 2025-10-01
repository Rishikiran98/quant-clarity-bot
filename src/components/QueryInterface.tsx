import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Search, FileText } from "lucide-react";
import RetrievalVisualization from "./RetrievalVisualization";
import AnswerDisplay from "./AnswerDisplay";

const exampleQueries = [
  "What are the key risk factors disclosed in Tesla's latest 10-K filing?",
  "Summarize Apple's revenue growth trends from recent earnings reports",
  "What insurance risks does Progressive report regarding climate change?",
];

const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [answer, setAnswer] = useState("");

  const handleSubmit = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setShowResults(false);
    
    // Simulate retrieval process
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock retrieved chunks
    const mockChunks = [
      {
        id: 1,
        content: "Risk Factor: Supply Chain Disruptions - We are subject to risks associated with supply chain disruptions...",
        source: "Tesla 10-K 2024, Page 23",
        similarity: 0.94,
        metadata: { ticker: "TSLA", fiscal_year: 2024, category: "Risk Factors" }
      },
      {
        id: 2,
        content: "Material weaknesses in our internal controls could result in material misstatements...",
        source: "Tesla 10-K 2024, Page 45",
        similarity: 0.87,
        metadata: { ticker: "TSLA", fiscal_year: 2024, category: "Controls & Procedures" }
      },
      {
        id: 3,
        content: "Competition in the automotive industry is intense and increasing...",
        source: "Tesla 10-K 2024, Page 18",
        similarity: 0.82,
        metadata: { ticker: "TSLA", fiscal_year: 2024, category: "Business Overview" }
      }
    ];
    
    setRetrievedChunks(mockChunks);
    
    // Mock LLM response
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setAnswer(`Based on Tesla's latest 10-K filing, several key risk factors are disclosed:

**Supply Chain & Production Risks**: Tesla faces significant risks from supply chain disruptions, particularly in sourcing battery cells and semiconductors. The company acknowledges potential impacts on production capacity and delivery timelines [Source: Tesla 10-K 2024, Page 23].

**Internal Controls**: Material weaknesses in internal controls over financial reporting could result in misstatements in financial documents, affecting investor confidence and regulatory compliance [Source: Tesla 10-K 2024, Page 45].

**Competitive Pressure**: The automotive industry competition is intensifying, with both traditional automakers and new EV startups challenging Tesla's market position. This could impact pricing power and market share [Source: Tesla 10-K 2024, Page 18].`);
    
    setIsLoading(false);
    setShowResults(true);
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
            <AnswerDisplay answer={answer} />
          </div>
        )}
      </div>
    </section>
  );
};

export default QueryInterface;
