import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Trash2, Search, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SavedQuery {
  id: string;
  title: string;
  query: string;
  tags: string[];
  created_at: string;
}

interface SavedQueriesProps {
  onSelectQuery: (query: string) => void;
}

const SavedQueries = ({ onSelectQuery }: SavedQueriesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuery, setNewQuery] = useState({ title: '', query: '', tags: '' });

  useEffect(() => {
    fetchSavedQueries();
  }, [user]);

  const fetchSavedQueries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch saved queries',
        variant: 'destructive'
      });
      return;
    }

    setQueries(data || []);
  };

  const handleSaveQuery = async () => {
    if (!user || !newQuery.title || !newQuery.query) {
      toast({
        title: 'Validation Error',
        description: 'Title and query are required',
        variant: 'destructive'
      });
      return;
    }

    const tags = newQuery.tags.split(',').map(t => t.trim()).filter(Boolean);

    const { error } = await supabase
      .from('saved_queries')
      .insert({
        user_id: user.id,
        title: newQuery.title,
        query: newQuery.query,
        tags
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save query',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Query saved successfully'
    });

    setNewQuery({ title: '', query: '', tags: '' });
    setIsDialogOpen(false);
    fetchSavedQueries();
  };

  const handleDeleteQuery = async (id: string) => {
    const { error } = await supabase
      .from('saved_queries')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete query',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Query deleted'
    });

    fetchSavedQueries();
  };

  const filteredQueries = queries.filter(q =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Saved Queries</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle>Save New Query</DialogTitle>
              <DialogDescription>
                Save a query for quick access later
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q3 Revenue Analysis"
                  value={newQuery.title}
                  onChange={(e) => setNewQuery({ ...newQuery, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="query">Query</Label>
                <Input
                  id="query"
                  placeholder="What were the key financial metrics..."
                  value={newQuery.query}
                  onChange={(e) => setNewQuery({ ...newQuery, query: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="revenue, quarterly, analysis"
                  value={newQuery.tags}
                  onChange={(e) => setNewQuery({ ...newQuery, tags: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveQuery} className="w-full">
                Save Query
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {filteredQueries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No saved queries yet</p>
            </div>
          ) : (
            filteredQueries.map((query) => (
              <div
                key={query.id}
                className="p-4 rounded-lg border border-border/50 bg-background/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{query.title}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteQuery(query.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {query.query}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {query.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectQuery(query.query)}
                    className="text-xs"
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default SavedQueries;
