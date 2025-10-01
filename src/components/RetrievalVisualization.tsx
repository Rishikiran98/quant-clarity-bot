import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp } from "lucide-react";

interface Chunk {
  id: string | number;
  content: string;
  source: string;
  similarity: number;
  metadata: {
    ticker: string;
    fiscal_year: number;
    category: string;
  };
}

interface Props {
  chunks: Chunk[];
}

const RetrievalVisualization = ({ chunks }: Props) => {
  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-xl font-bold">Retrieved Documents</h3>
          <p className="text-sm text-muted-foreground">Top {chunks.length} relevant chunks</p>
        </div>
      </div>

      <div className="space-y-4">
        {chunks.map((chunk) => (
          <div
            key={chunk.id}
            className="p-4 rounded-lg border border-border bg-background/50 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="text-xs">
                {chunk.metadata.ticker}
              </Badge>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-sm font-mono text-accent">
                  {(chunk.similarity * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <p className="text-sm text-foreground mb-3 line-clamp-3">
              {chunk.content}
            </p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{chunk.source}</span>
              <span className="text-primary">{chunk.metadata.category}</span>
            </div>
            
            {/* Similarity bar */}
            <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${chunk.similarity * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RetrievalVisualization;
