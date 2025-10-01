import Hero from "@/components/Hero";
import QueryInterface from "@/components/QueryInterface";
import MetricsDashboard from "@/components/MetricsDashboard";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import SimilarityHeatmap from "@/components/SimilarityHeatmap";
import DriftMonitoring from "@/components/DriftMonitoring";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <QueryInterface />
      
      {/* Advanced Visualizations */}
      <section className="container mx-auto px-6 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Advanced Analytics</h2>
            <p className="text-muted-foreground">
              Deep insights into retrieval quality and system performance
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <SimilarityHeatmap />
            <DriftMonitoring />
          </div>
        </div>
      </section>
      
      <MetricsDashboard />
      <ArchitectureDiagram />
      
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p className="text-sm">
            Financial RAG System Demo • Powered by Lovable AI (Gemini 2.5 Flash)
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
