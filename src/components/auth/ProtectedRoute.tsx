
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isCircuitBreakerActive } from '@/integrations/supabase/client';

const ProtectedRoute = () => {
  const { 
    isAuthenticated, 
    loading, 
    authState, 
    forceRecovery, 
    authError 
  } = useAuth();
  
  const location = useLocation();
  const [isRecovering, setIsRecovering] = React.useState(false);
  
  // Handle recovery action
  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      await forceRecovery();
    } finally {
      setIsRecovering(false);
    }
  };
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }
  
  // Handle auth error states with recovery options
  if (authState === 'ERROR' || isCircuitBreakerActive()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {authError || "There was a problem with authentication. This might be due to a stale session after the server was restarted."}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRecovery} 
              disabled={isRecovering}
              className="w-full"
            >
              {isRecovering ? "Resetting..." : "Reset Authentication"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/auth'} 
              className="w-full"
            >
              Go to Login Page
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              If problems persist, try clearing your browser cache and cookies.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  
  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
