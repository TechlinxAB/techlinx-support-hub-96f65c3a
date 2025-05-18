
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const handleNavigation = (path: string) => {
    // Simple navigation without redirection logic - let ProtectedRoute handle auth
    navigate(path);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-2xl w-full p-6 shadow-lg">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary">Welcome to Techlinx Helpdesk</h1>
          
          <p className="text-xl text-gray-600">
            Your central hub for technical support and service management
          </p>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : user ? (
            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => handleNavigation('/dashboard')}
                className="px-8"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => handleNavigation('/auth')}
                className="px-8"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Index;
