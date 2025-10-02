import React, { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import KPICards from "@/components/KPICards";
import ProfileSidebar from "@/components/ProfileSidebar";
import SavedQueries from "@/components/SavedQueries";
import UserSettings from "@/components/UserSettings";
import QueryInterface from "@/components/QueryInterface";
import MetricsDashboard from "@/components/MetricsDashboard";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import SimilarityHeatmap from "@/components/SimilarityHeatmap";
import DriftMonitoring from "@/components/DriftMonitoring";
import QueryHistory from "@/components/QueryHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedQuery, setSelectedQuery] = useState<string>("");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-background via-card/30 to-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Financial Intelligence Dashboard
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              AI-powered document retrieval and analysis system for financial data. 
              Get instant insights with grounded, auditable responses.
            </p>
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile & Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24 space-y-6">
              <ProfileSidebar />
              <UserSettings />
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

            {/* Query Interface */}
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Query Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get AI-powered insights from your documents
                </p>
              </div>
              <QueryInterface />
            </section>

            {/* Query Management Section */}
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Query Management</h2>
                <p className="text-sm text-muted-foreground">
                  Access your saved queries and recent history
                </p>
              </div>
              
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Tabs defaultValue="history" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="saved">Saved</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="history">
                      <QueryHistory onSelectQuery={setSelectedQuery} />
                    </TabsContent>
                    
                    <TabsContent value="saved">
                      <SavedQueries onSelectQuery={setSelectedQuery} />
                    </TabsContent>
                  </Tabs>
                </div>
                
                <div className="lg:col-span-2 space-y-6">
                  <SimilarityHeatmap />
                  <DriftMonitoring />
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
