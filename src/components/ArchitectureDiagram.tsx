import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database, 
  GitBranch, 
  Cloud, 
  Boxes,
  ArrowRight,
  Layers
} from "lucide-react";

const ArchitectureDiagram = () => {
  const stages = [
    {
      title: "Data Ingestion",
      icon: Database,
      description: "SEC filings, 10-K/10-Q, earnings reports",
      tech: ["Python", "NER", "Metadata tagging"]
    },
    {
      title: "Embedding Pipeline",
      icon: Layers,
      description: "Chunking + vector embeddings",
      tech: ["OpenAI Embeddings", "Text Splitter"]
    },
    {
      title: "Vector Store",
      icon: Boxes,
      description: "Hybrid retrieval system",
      tech: ["FAISS/Pinecone", "Metadata filtering"]
    },
    {
      title: "LLM + Grounding",
      icon: GitBranch,
      description: "Domain-adapted model with citations",
      tech: ["GPT-4", "FinBERT", "LangChain"]
    },
    {
      title: "Deployment",
      icon: Cloud,
      description: "Scalable inference endpoints",
      tech: ["AWS SageMaker", "Docker", "FastAPI"]
    }
  ];

  return (
    <section className="container mx-auto px-6 py-12 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-3">Production Architecture</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            End-to-end RAG pipeline with MLflow monitoring, drift detection, and automated evaluation
          </p>
        </div>

        <div className="relative">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary -translate-y-1/2" />
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 relative">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div key={idx} className="relative">
                  <Card className="p-6 border-border bg-card hover:border-primary/50 transition-all h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      {idx < stages.length - 1 && (
                        <ArrowRight className="hidden lg:block absolute -right-8 top-12 w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <h3 className="font-bold mb-2">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">
                      {stage.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {stage.tech.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="mt-8 p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <h3 className="text-xl font-bold mb-4">LLMOps Stack</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-primary">Monitoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• MLflow experiment tracking</li>
                <li>• Custom evaluation metrics</li>
                <li>• Drift detection alerts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-accent">Retrieval</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hybrid dense + sparse search</li>
                <li>• Metadata-aware filtering</li>
                <li>• Re-ranking with cross-encoders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-chart-3">Deployment</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• SageMaker autoscaling</li>
                <li>• Docker containerization</li>
                <li>• FastAPI REST endpoints</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ArchitectureDiagram;
