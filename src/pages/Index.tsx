import Hero from "@/components/Hero";
import QueryInterface from "@/components/QueryInterface";
import MetricsDashboard from "@/components/MetricsDashboard";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <QueryInterface />
      <MetricsDashboard />
      <ArchitectureDiagram />
      
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p className="text-sm">
            Financial RAG System Demo • Built with LangChain, FAISS, AWS SageMaker & MLflow
          </p>
          <p className="text-xs mt-2">
            Production-grade LLMOps pipeline for grounded, auditable financial intelligence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
