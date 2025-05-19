
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  isCircuitBreakerActive, 
  detectAuthLoops,
  resetCircuitBreaker
} from '@/integrations/supabase/client';

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
  const [redirecting, setRedirecting] = React.useState(false);
  const [authAttempts, setAuthAttempts] = React.useState(0);
  
  // Handle diagnostic info for circuit breaker
  const circuitBreakerInfo = isCircuitBreakerActive();
  const authLoopDetected = detectAuthLoops();

  // Add a useEffect to handle auth retries
  useEffect(() => {
    if (!isAuthenticated && !loading && authState !== 'ERROR' && authAttempts < 2) {
      // Try to wait a bit and let auth complete, in case of race conditions
      const timer = setTimeout(() => {
        setAuthAttempts(prev => prev + 1);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, authState, authAttempts]);
  
  // Handle recovery action - with better error handling
  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      await forceRecovery();
      setRedirecting(true);
      // Short delay to allow state updates before redirecting
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    } catch (err) {
      console.error("Recovery failed:", err);
      setIsRecovering(false);
    }
  };
  
  // Handle forcing auth page navigation
  const handleNavigateToAuth = () => {
    setRedirecting(true);
    // Reset circuit breaker before navigating
    resetCircuitBreaker();
    window.location.href = '/auth';
  };
  
  // Show loading spinner while checking authentication
  if ((loading || authAttempts < 2) && !redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }
  
  // Handle auth error states with recovery options
  if (authState === 'ERROR' || circuitBreakerInfo.active || authLoopDetected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {authError || circuitBreakerInfo.reason || "There was a problem with authentication. This might be due to a stale session."}
              
              {circuitBreakerInfo.active && circuitBreakerInfo.remainingSeconds && (
                <p className="mt-2 text-sm">
                  Authentication temporarily disabled for{' '}
                  {Math.floor(circuitBreakerInfo.remainingSeconds / 60)} minutes and{' '}
                  {circuitBreakerInfo.remainingSeconds % 60} seconds.
                </p>
              )}
              
              {authLoopDetected && (
                <p className="mt-2 text-sm">
                  Authentication loop detected. The system is attempting to authenticate too frequently.
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRecovery} 
              disabled={isRecovering || redirecting}
              className="w-full"
            >
              {isRecovering ? "Resetting..." : "Reset Authentication"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleNavigateToAuth}
              disabled={redirecting}
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
