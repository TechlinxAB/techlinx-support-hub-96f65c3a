
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, MessageCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/80 px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Techlinx Helpdesk
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Multi-Company IT Support Platform with Advanced Consultant Tools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')} 
                size="lg" 
                className="gap-2"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg" 
                className="gap-2"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <section className="py-16 bg-muted/40">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Case Management</h3>
              <p className="text-muted-foreground text-center">
                Track and manage support requests with our intuitive case management system.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Company Management</h3>
              <p className="text-muted-foreground text-center">
                Manage multiple companies with dedicated dashboards and documentation.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Real-time Updates</h3>
              <p className="text-muted-foreground text-center">
                Stay informed with real-time notifications and status updates.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Techlinx Helpdesk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
