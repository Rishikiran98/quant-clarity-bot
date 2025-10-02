import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch from database
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('query_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && !error) {
        setHistory(data.map((item) => ({
          id: item.id,
          query: item.query,
          timestamp: new Date(item.created_at),
          documentsRetrieved: item.documents_retrieved || 0,
          avgSimilarity: Number(item.avg_similarity) || 0
        })));
      }
    };

    fetchHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('query_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'query_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
      
      {history.length > 0 && user && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={async () => {
            await supabase
              .from('query_history')
              .delete()
              .eq('user_id', user.id);
            setHistory([]);
          }}
        >
          Clear History
        </Button>
      )}
    </Card>
  );
};

export default QueryHistory;
