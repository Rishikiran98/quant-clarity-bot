import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface HeatmapData {
  query: string;
  docs: { name: string; score: number }[];
}

const SimilarityHeatmap = () => {
  // Mock data for heatmap visualization
  const heatmapData: HeatmapData[] = [
    {
      query: "Tesla risks",
      docs: [
        { name: "10-K p23", score: 0.94 },
        { name: "10-K p45", score: 0.87 },
        { name: "10-K p18", score: 0.82 },
        { name: "Q3 Report", score: 0.71 },
      ]
    },
    {
      query: "Apple revenue",
      docs: [
        { name: "Q4 Earnings", score: 0.96 },
        { name: "10-K p34", score: 0.89 },
        { name: "Analyst Call", score: 0.78 },
        { name: "10-Q p12", score: 0.73 },
      ]
    },
    {
      query: "Climate risk",
      docs: [
        { name: "PGR Disclosure", score: 0.92 },
        { name: "ESG Report", score: 0.88 },
        { name: "10-K p56", score: 0.81 },
        { name: "Risk Memo", score: 0.69 },
      ]
    },
  ];

  const getColorClass = (score: number) => {
    if (score >= 0.9) return "bg-accent";
    if (score >= 0.8) return "bg-primary";
    if (score >= 0.7) return "bg-chart-3";
    return "bg-muted";
  };

  const getOpacity = (score: number) => {
    return Math.max(0.3, score);
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-xl font-bold">Similarity Heatmap</h3>
          <p className="text-sm text-muted-foreground">Document relevance across recent queries</p>
        </div>
      </div>

      <div className="space-y-4">
        {heatmapData.map((row, rowIdx) => (
          <div key={rowIdx}>
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              {row.query}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {row.docs.map((doc, docIdx) => (
                <div
                  key={docIdx}
                  className="relative group"
                >
                  <div
                    className={`${getColorClass(doc.score)} rounded-lg p-4 transition-all hover:scale-105 cursor-pointer`}
                    style={{ opacity: getOpacity(doc.score) }}
                  >
                    <div className="text-xs font-mono text-background font-bold">
                      {doc.name}
                    </div>
                    <div className="text-xs font-bold mt-1 text-background">
                      {(doc.score * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-muted-foreground">
                      Similarity: {(doc.score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Similarity Score</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" style={{ opacity: 0.7 }} />
              <span className="text-muted-foreground">Low (70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" style={{ opacity: 0.85 }} />
              <span className="text-muted-foreground">Medium (85%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent" style={{ opacity: 0.95 }} />
              <span className="text-muted-foreground">High (95%)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SimilarityHeatmap;
