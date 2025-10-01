import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Activity } from "lucide-react";

const DriftMonitoring = () => {
  // Mock time-series data for grounding precision
  const timeSeriesData = [
    { date: "Week 1", precision: 98.2, queries: 1200 },
    { date: "Week 2", precision: 98.5, queries: 1450 },
    { date: "Week 3", precision: 98.7, queries: 1680 },
    { date: "Week 4", precision: 98.3, queries: 1520 },
    { date: "Week 5", precision: 97.9, queries: 1890 },
    { date: "Week 6", precision: 97.6, queries: 2100 },
  ];

  const maxPrecision = Math.max(...timeSeriesData.map(d => d.precision));
  const minPrecision = Math.min(...timeSeriesData.map(d => d.precision));
  const latestPrecision = timeSeriesData[timeSeriesData.length - 1].precision;
  const previousPrecision = timeSeriesData[timeSeriesData.length - 2].precision;
  const trend = latestPrecision - previousPrecision;

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Drift Monitoring</h3>
            <p className="text-sm text-muted-foreground">Grounding precision over time</p>
          </div>
        </div>
        
        <Badge 
          variant="outline" 
          className={trend < 0 ? "border-destructive text-destructive" : "border-accent text-accent"}
        >
          {trend < 0 ? (
            <TrendingDown className="w-3 h-3 mr-1" />
          ) : (
            <TrendingUp className="w-3 h-3 mr-1" />
          )}
          {Math.abs(trend).toFixed(1)}%
        </Badge>
      </div>

      {/* Line chart visualization */}
      <div className="relative h-48 mb-6">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pr-2">
          <span>{maxPrecision.toFixed(1)}%</span>
          <span>{((maxPrecision + minPrecision) / 2).toFixed(1)}%</span>
          <span>{minPrecision.toFixed(1)}%</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full relative border-l border-b border-border">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-full border-t border-border/30" />
            ))}
          </div>

          {/* Data line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="50%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              points={timeSeriesData
                .map((d, i) => {
                  const x = (i / (timeSeriesData.length - 1)) * 100;
                  const y = ((maxPrecision - d.precision) / (maxPrecision - minPrecision)) * 100;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            
            {/* Data points */}
            {timeSeriesData.map((d, i) => {
              const x = (i / (timeSeriesData.length - 1)) * 100;
              const y = ((maxPrecision - d.precision) / (maxPrecision - minPrecision)) * 100;
              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  className="fill-primary stroke-background stroke-2"
                />
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-muted-foreground">
            {timeSeriesData.map((d, i) => (
              <span key={i} className="transform -translate-x-1/2">
                {d.date}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Current</div>
          <div className="text-2xl font-bold text-primary">{latestPrecision}%</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Avg (6 weeks)</div>
          <div className="text-2xl font-bold text-foreground">
            {(timeSeriesData.reduce((sum, d) => sum + d.precision, 0) / timeSeriesData.length).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Std Dev</div>
          <div className="text-2xl font-bold text-muted-foreground">±0.4%</div>
        </div>
      </div>

      {trend < -0.5 && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <TrendingDown className="w-4 h-4" />
            <span className="font-medium">Alert: Drift detected</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Grounding precision has dropped 0.7% over the past week. Consider reviewing retrieval quality.
          </p>
        </div>
      )}
    </Card>
  );
};

export default DriftMonitoring;
