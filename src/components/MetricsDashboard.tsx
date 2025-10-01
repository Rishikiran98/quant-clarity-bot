import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Zap, AlertCircle } from "lucide-react";

const MetricsDashboard = () => {
  const metrics = [
    {
      label: "Grounding Precision",
      value: "98.7%",
      trend: "+2.3%",
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Avg Query Latency",
      value: "1.2s",
      trend: "-15%",
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Hallucination Rate",
      value: "0.3%",
      trend: "-0.5%",
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Queries Processed",
      value: "12.4K",
      trend: "+18%",
      icon: Activity,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <section className="container mx-auto px-6 py-12 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3">Evaluation Metrics</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of RAG pipeline performance and quality
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <Card key={idx} className="p-6 border-border bg-card hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {metric.trend}
                  </Badge>
                </div>
                <div className="text-3xl font-bold mb-1">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 border-border bg-gradient-to-br from-card to-card/50">
          <h3 className="text-xl font-bold mb-6">System Health Overview</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Retrieval Accuracy</span>
                <span className="font-mono text-accent">96.2%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-primary w-[96.2%]" />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Answer Relevance</span>
                <span className="font-mono text-primary">94.8%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-chart-2 w-[94.8%]" />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Citation Coverage</span>
                <span className="font-mono text-chart-2">99.1%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-chart-2 to-accent w-[99.1%]" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default MetricsDashboard;
