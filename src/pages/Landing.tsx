import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Lock, Zap, FileText, Search, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced RAG technology for intelligent financial document analysis',
    },
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Semantic search across all your financial documents instantly',
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Organize and process PDFs, reports, and financial statements',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Real-time metrics and performance monitoring',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-second query responses with optimized retrieval',
    },
    {
      icon: Lock,
      title: 'Secure & Private',
      description: 'Enterprise-grade security for your sensitive financial data',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quant Clarity
            </span>
          </div>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Content */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Financial Intelligence
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform how you analyze financial documents with our advanced RAG system.
            Get instant insights from your reports, statements, and research papers.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="gap-2"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Financial Analysis
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to extract insights from financial documents
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">&lt;100ms</div>
              <div className="text-muted-foreground">Average Query Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">Secure</div>
              <div className="text-muted-foreground">Enterprise-Grade Security</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="border-2 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Financial Analysis?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join professionals who trust our platform for their financial intelligence needs
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="gap-2"
            >
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Quant Clarity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
