
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  isCircuitBreakerActive, 
  detectAuthLoops,
  resetCircuitBreaker,
  performFullAuthRecovery
} from '@/utils/authRecovery';

const ProtectedRoute = () => {
  const { 
    isAuthenticated, 
    loading, 
    authState, 
    forceRecovery, 
    authError,
    session
  } = useAuth();
  
  const location = useLocation();
  const [isRecovering, setIsRecovering] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [forceTimeout, setForceTimeout] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Track if we're in a "force through" mode after recovery
  const [forceThrough, setForceThrough] = useState(false);
  
  // Handle diagnostic info for circuit breaker
  const circuitBreakerInfo = isCircuitBreakerActive();
  const authLoopDetected = detectAuthLoops();

  // Add a strict timeout to force progression after 3 seconds max
  useEffect(() => {
    // Set a timeout to force progress after 3 seconds
    const timer = setTimeout(() => {
      if (!redirecting) {
        console.log("Force timeout triggered - progressing auth flow");
        setForceTimeout(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [redirecting]);
  
  // Add protection against excessive recovery attempts
  useEffect(() => {
    if (attemptCount > 3) {
      // If we've tried to recover multiple times, force through
      setForceThrough(true);
    }
  }, [attemptCount]);
  
  // Handle recovery action
  const handleRecovery = async () => {
    setIsRecovering(true);
    setAttemptCount(prev => prev + 1);
    
    try {
      await performFullAuthRecovery();
      setRedirecting(true);
      // Add a cache-busting parameter
      window.location.href = '/auth?recovery=' + Date.now();
    } catch (err) {
      console.error("Recovery failed:", err);
      setIsRecovering(false);
      
      if (attemptCount > 2) {
        // If we've tried multiple times, force through anyway
        setForceThrough(true);
      }
    }
  };
  
  // Handle forcing auth page navigation
  const handleNavigateToAuth = () => {
    setRedirecting(true);
    resetCircuitBreaker();
    // Add a cache-busting parameter
    window.location.href = '/auth?redirect=' + encodeURIComponent(location.pathname) + '&t=' + Date.now();
  };
  
  // Handle force dashboard navigation
  const handleForceDashboard = () => {
    setRedirecting(true);
    resetCircuitBreaker();
    // Add a cache-busting parameter
    window.location.href = '/?force=' + Date.now();
  };
  
  // If we're stuck in a loop but have tried recovery multiple times, force through
  if (forceThrough) {
    return <Outlet />;
  }
  
  // Show loading spinner while checking authentication - with a timeout
  if ((loading && !forceTimeout) && !redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
        <div className="flex gap-2 mt-4">
          <Button 
            variant="link" 
            onClick={handleNavigateToAuth}
            className="text-sm"
          >
            Go to login
          </Button>
          <Button 
            variant="link" 
            onClick={handleForceDashboard}
            className="text-sm"
          >
            Force dashboard
          </Button>
        </div>
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
            
            <Button
              variant="outline"
              onClick={() => setForceThrough(true)}
              className="w-full mt-2"
            >
              Force Access Anyway
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              If problems persist, try clearing your browser cache and cookies.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // IMPORTANT FIX: If we have a session, we should allow access even if other flags aren't set
  if (session || isAuthenticated || forceTimeout) {
    return <Outlet />;
  }
  
  // If definitely not authenticated, redirect to login
  const redirectPath = encodeURIComponent(location.pathname);
  window.location.href = `/auth?redirect=${redirectPath}&t=${Date.now()}`;
  return null;
};

export default ProtectedRoute;
