import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardHeader from "@/components/DashboardHeader";
import ProfileSidebar from "@/components/ProfileSidebar";
import DocumentManagement from "@/components/DocumentManagement";
import QueryInterface from "@/components/QueryInterface";
import QueryHistory from "@/components/QueryHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, MessageSquare, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
                Financial RAG Assistant
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI-Powered
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Upload your financial documents and get instant, accurate answers to your queries with AI-powered analysis.
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
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Your Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Uploaded files</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Questions asked</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Interface */}
            <Tabs defaultValue="query" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-3">
                <TabsTrigger value="query">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask Questions
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  My Documents
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Query History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="query" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ask a Question</CardTitle>
                    <CardDescription>
                      Get instant answers from your uploaded financial documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QueryInterface />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>
                      Upload and manage your financial documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentManagement />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Query History</CardTitle>
                    <CardDescription>
                      View your previous questions and answers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QueryHistory onSelectQuery={setSelectedQuery} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
