import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Search, FileText, Zap, Activity, CheckCircle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const KPICards = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    documentsIndexed: 0,
    avgResponseTime: 0,
    avgSimilarity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        // Fetch total queries
        const { count: queryCount } = await supabase
          .from('query_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch documents indexed
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        // Fetch average response time and similarity
        const { data: perfData } = await supabase
          .from('performance_metrics')
          .select('latency_ms, avg_similarity')
          .eq('user_id', user.id)
          .order('ts', { ascending: false })
          .limit(100);

        let avgLatency = 0;
        let avgSim = 0;

        if (perfData && perfData.length > 0) {
          const totalLatency = perfData.reduce((sum, record) => sum + (record.latency_ms || 0), 0);
          avgLatency = Math.round(totalLatency / perfData.length);

          const validSimilarities = perfData.filter(r => r.avg_similarity !== null);
          if (validSimilarities.length > 0) {
            const totalSim = validSimilarities.reduce((sum, record) => sum + Number(record.avg_similarity), 0);
            avgSim = (totalSim / validSimilarities.length) * 100;
          }
        }

        setMetrics({
          totalQueries: queryCount || 0,
          documentsIndexed: docCount || 0,
          avgResponseTime: avgLatency,
          avgSimilarity: avgSim,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  const kpis = [
    {
      title: 'Total Queries',
      value: metrics.totalQueries,
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Documents Indexed',
      value: metrics.documentsIndexed,
      icon: FileText,
      color: 'from-emerald-500 to-green-500',
    },
    {
      title: 'Avg Response Time',
      value: metrics.avgResponseTime,
      suffix: 'ms',
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Avg Similarity',
      value: Math.round(metrics.avgSimilarity * 10) / 10,
      suffix: '%',
      icon: CheckCircle,
      color: 'from-violet-500 to-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        
        return (
          <Card 
            key={index} 
            className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color} bg-opacity-10`}>
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {kpi.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter end={kpi.value} duration={2000} />
                  </span>
                  {kpi.suffix && (
                    <span className="text-lg text-muted-foreground">
                      {kpi.suffix}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className={`h-1 bg-gradient-to-r ${kpi.color} opacity-50`} />
          </Card>
        );
      })}
    </div>
  );
};

export default KPICards;
