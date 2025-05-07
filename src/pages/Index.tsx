
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building, User, MessageCircle, FileText } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Welcome to the Support Portal</h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Your centralized platform for managing case documentation, company dashboards, and communications.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="px-8"
              >
                <User className="mr-2 h-5 w-5" /> Login
              </Button>
              <Button 
                size="lg" 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="px-8"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Company Management</h3>
                  <p className="text-muted-foreground">
                    Manage multiple companies with custom dashboards, news, and documentation.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Case Management</h3>
                  <p className="text-muted-foreground">
                    Track and manage support cases with detailed history and attachments.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Documentation</h3>
                  <p className="text-muted-foreground">
                    Create and share comprehensive documentation with customizable layouts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Support Portal System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
