
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { hasValidSession } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Add a secondary session check to avoid flashing the wrong UI
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkSession = async () => {
      const valid = await hasValidSession();
      setSessionValid(valid);
    };
    
    if (!loading) {
      checkSession();
    }
  }, [user, loading]);
  
  // Determine if we should show authenticated content
  const isAuthenticated = user && sessionValid;
  const isLoading = loading || sessionValid === null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-2xl w-full p-6 shadow-lg">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-primary">Welcome to Techlinx Helpdesk</h1>
          
          <p className="text-xl text-gray-600">
            Your central hub for technical support and service management
          </p>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : isAuthenticated ? (
            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/dashboard')}
                className="px-8"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
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
