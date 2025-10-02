import React, { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import KPICards from "@/components/KPICards";
import ProfileSidebar from "@/components/ProfileSidebar";
import DocumentManagement from "@/components/DocumentManagement";
import QueryInterface from "@/components/QueryInterface";
import MetricsDashboard from "@/components/MetricsDashboard";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import SimilarityHeatmap from "@/components/SimilarityHeatmap";
import DriftMonitoring from "@/components/DriftMonitoring";
import QueryHistory from "@/components/QueryHistory";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [selectedQuery, setSelectedQuery] = useState<string>("");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-background via-card/30 to-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Financial Intelligence Dashboard
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                BETA
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mb-4">
              AI-powered document retrieval and analysis system for financial data. 
              Get instant insights with grounded, auditable responses.
            </p>
            <FeedbackDialog />
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ProfileSidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* KPI Cards */}
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Key performance indicators for your RAG system
                </p>
              </div>
              <KPICards />
            </section>

            {/* Query Interface with Document Management */}
            <section>
              <Tabs defaultValue="query" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="query">Query Engine</TabsTrigger>
                  <TabsTrigger value="documents">Document Library</TabsTrigger>
                </TabsList>
                
                <TabsContent value="query">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold">Query Engine</h2>
                    <p className="text-sm text-muted-foreground">
                      Ask questions and get AI-powered insights from your documents
                    </p>
                  </div>
                  <QueryInterface />
                </TabsContent>
                
                <TabsContent value="documents">
                  <DocumentManagement />
                </TabsContent>
              </Tabs>
            </section>

            {/* Analytics Section */}
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Advanced Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Deep insights into retrieval quality and system performance
                </p>
              </div>
              
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <SimilarityHeatmap />
                  <DriftMonitoring />
                </div>
                <div>
                  <QueryHistory onSelectQuery={setSelectedQuery} />
                </div>
              </div>
            </section>

            {/* System Metrics */}
            <section>
              <MetricsDashboard />
            </section>

            {/* Architecture */}
            <section>
              <ArchitectureDiagram />
            </section>
          </div>
        </div>
      </div>
      
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p className="text-sm">
            Financial RAG System • Powered by Lovable AI (Gemini 2.5 Flash)
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
