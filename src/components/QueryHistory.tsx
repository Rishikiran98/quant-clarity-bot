import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryRecord {
  id: string;
  query: string;
  timestamp: Date;
  documentsRetrieved: number;
  avgSimilarity: number;
}

interface Props {
  onSelectQuery?: (query: string) => void;
}

const QueryHistory = ({ onSelectQuery }: Props) => {
  const [history, setHistory] = useState<QueryRecord[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const stored = localStorage.getItem('queryHistory');
    if (stored) {
      const parsed = JSON.parse(stored);
      setHistory(parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })));
    }
  }, []);

  const addQuery = (query: string, docsRetrieved: number, avgSim: number) => {
    const newRecord: QueryRecord = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      documentsRetrieved: docsRetrieved,
      avgSimilarity: avgSim
    };
    
    const updated = [newRecord, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem('queryHistory', JSON.stringify(updated));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Expose addQuery globally for QueryInterface to use
  useEffect(() => {
    (window as any).addToQueryHistory = addQuery;
  }, [history]);

  return (
    <Card className="p-6 border-border bg-card animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <History className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-xl font-bold">Query History</h3>
          <p className="text-sm text-muted-foreground">Recent searches</p>
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No queries yet. Start by asking a question!
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record, idx) => (
              <div
                key={record.id}
                className="p-3 rounded-lg border border-border bg-background/50 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => onSelectQuery?.(record.query)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium line-clamp-2 flex-1">
                    {record.query}
                  </p>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {record.documentsRetrieved}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(record.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    {(record.avgSimilarity * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {history.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={() => {
            setHistory([]);
            localStorage.removeItem('queryHistory');
          }}
        >
          Clear History
        </Button>
      )}
    </Card>
  );
};

export default QueryHistory;
