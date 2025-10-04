import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Chunk {
  id: string | number;
  content: string;
  source: string;
  similarity: number;
  metadata?: {
    ticker?: string;
    fiscal_year?: number;
    category?: string;
  };
}

interface Props {
  chunks: Chunk[];
}

const RetrievalVisualization = ({ chunks }: Props) => {
  const [expandedChunks, setExpandedChunks] = useState<Set<string | number>>(new Set());

  const toggleChunk = (id: string | number) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const downloadAllChunks = () => {
    const content = chunks.map((chunk, idx) => {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETRIEVED DOCUMENT ${idx + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: ${chunk.source}
Similarity Score: ${(chunk.similarity * 100).toFixed(1)}%
${chunk.metadata?.ticker ? `Ticker: ${chunk.metadata.ticker}` : ''}
${chunk.metadata?.category ? `Category: ${chunk.metadata.category}` : ''}
${chunk.metadata?.fiscal_year ? `Fiscal Year: ${chunk.metadata.fiscal_year}` : ''}

CONTENT:
${chunk.content}

`;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retrieved-documents-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6 border-border bg-card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Retrieved Documents</h3>
            <p className="text-sm text-muted-foreground">Top {chunks.length} relevant chunks</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadAllChunks}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download All
        </Button>
      </div>

      <div className="space-y-4">
        {chunks.map((chunk, idx) => {
          const isExpanded = expandedChunks.has(chunk.id);
          return (
            <div
              key={chunk.id}
              className="p-4 rounded-lg border border-border bg-background/50 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                {chunk.metadata?.ticker && (
                  <Badge variant="outline" className="text-xs">
                    {chunk.metadata.ticker}
                  </Badge>
                )}
                {!chunk.metadata?.ticker && <div />}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm font-mono text-accent">
                    {(chunk.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className={`mb-3 ${isExpanded ? '' : 'line-clamp-4'}`}>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {chunk.content}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleChunk(chunk.id)}
                className="text-xs text-primary hover:text-primary/80 p-0 h-auto font-normal"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Read full document
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                <span>{chunk.source}</span>
                {chunk.metadata?.category && (
                  <span className="text-primary">{chunk.metadata.category}</span>
                )}
              </div>
              
              {/* Similarity bar with animation */}
              <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${chunk.similarity * 100}%`,
                    transitionDelay: `${idx * 150}ms`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RetrievalVisualization;
