import { Database, FileText, GitBranch, LineChart } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-card to-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="container relative mx-auto px-6 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Production-Grade LLMOps Pipeline</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
            Financial RAG System
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Retrieval-Augmented Generation powered by SEC filings, earnings reports, and risk disclosures. 
            Grounded, auditable responses with full source attribution.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:scale-105 animate-fade-in">
              <Database className="w-8 h-8 text-primary mb-3 mx-auto" />
              <div className="text-2xl font-bold text-foreground mb-1">
                <AnimatedCounter end={15} duration={2000} />K+
              </div>
              <div className="text-sm text-muted-foreground">Documents Indexed</div>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <FileText className="w-8 h-8 text-accent mb-3 mx-auto" />
              <div className="text-2xl font-bold text-foreground mb-1">
                <AnimatedCounter end={98.7} decimals={1} duration={2000} />%
              </div>
              <div className="text-sm text-muted-foreground">Grounding Precision</div>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:scale-105 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <LineChart className="w-8 h-8 text-primary mb-3 mx-auto" />
              <div className="text-2xl font-bold text-foreground mb-1">
                <AnimatedCounter end={1.2} decimals={1} duration={2000} />s
              </div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 hover:scale-105 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <GitBranch className="w-8 h-8 text-accent mb-3 mx-auto" />
              <div className="text-2xl font-bold text-foreground mb-1">
                <AnimatedCounter end={0.3} decimals={1} duration={2000} />%
              </div>
              <div className="text-sm text-muted-foreground">Hallucination Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
