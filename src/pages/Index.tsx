
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  
  const renderAuthButton = () => {
    switch (status) {
      case 'LOADING':
        return (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        );
      
      case 'AUTHENTICATED':
        return (
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => handleNavigation('/')}
              className="px-8"
            >
              Go to Dashboard
            </Button>
          </div>
        );
      
      case 'UNAUTHENTICATED':
      case 'ERROR':
      default:
        return (
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => handleNavigation('/auth')}
              className="px-8"
            >
              Sign In
            </Button>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-2xl w-full p-6 shadow-lg">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary">Welcome to Techlinx Helpdesk</h1>
          
          <p className="text-xl text-gray-600">
            Your central hub for technical support and service management
          </p>
          
          {renderAuthButton()}
          
          <div className="text-xs text-muted-foreground mt-6">
            Status: {status}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Index;
