import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileSidebar from "@/components/ProfileSidebar";
import DocumentManagement from "@/components/DocumentManagement";
import QueryInterface from "@/components/QueryInterface";
import QueryHistory from "@/components/QueryHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, History } from "lucide-react";

const UserDashboard = () => {
  const [selectedQuery, setSelectedQuery] = useState<string>("");
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-background via-card/30 to-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Financial Q&A Assistant
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Ask questions about your financial documents and get instant, accurate answers with source citations.
            </p>
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
            {/* Query Interface with Tabs */}
            <section>
              <Tabs defaultValue="query" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="query" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Ask Questions
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    My Documents
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Query History
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="query">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold">Ask a Question</h2>
                    <p className="text-sm text-muted-foreground">
                      Get answers from your uploaded financial documents with source citations and download links.
                    </p>
                  </div>
                  <QueryInterface onQueryComplete={() => {}} />
                </TabsContent>
                
                <TabsContent value="documents">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold">Document Library</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload and manage your financial documents for analysis.
                    </p>
                  </div>
                  <DocumentManagement />
                </TabsContent>

                <TabsContent value="history">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold">Query History</h2>
                    <p className="text-sm text-muted-foreground">
                      Review your past questions and answers.
                    </p>
                  </div>
                  <QueryHistory onSelectQuery={setSelectedQuery} />
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </div>
      </div>
      
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p className="text-sm">
            Financial RAG System • Powered by Lovable AI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;
