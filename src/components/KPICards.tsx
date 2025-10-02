import { Card } from '@/components/ui/card';
import { TrendingUp, Search, FileText, Zap, Activity, CheckCircle } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const KPICards = () => {
  const kpis = [
    {
      title: 'Total Queries',
      value: 12847,
      change: '+12.5%',
      trend: 'up',
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Documents Indexed',
      value: 1584,
      change: '+8.2%',
      trend: 'up',
      icon: FileText,
      color: 'from-emerald-500 to-green-500',
    },
    {
      title: 'Avg Response Time',
      value: 124,
      suffix: 'ms',
      change: '-15.3%',
      trend: 'down',
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Accuracy Score',
      value: 96.8,
      suffix: '%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const isPositive = kpi.trend === 'up';
        
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
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  isPositive ? 'text-accent' : 'text-chart-3'
                }`}>
                  <Activity className="h-3 w-3" />
                  {kpi.change}
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
