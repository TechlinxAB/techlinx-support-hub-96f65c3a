
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  isCircuitBreakerActive, 
  detectAuthLoops,
  resetCircuitBreaker,
  performFullAuthRecovery,
  isForceBypassActive,
  setForceBypass,
  initPauseUnpauseDetection,
  wasPauseDetected,
  clearPauseDetected,
  hasTooManyRecoveryAttempts,
  resetRecoveryAttempts
} from '@/utils/authRecovery';
import { supabase, STORAGE_KEY } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [forceTimeout, setForceTimeout] = useState(false);
  const [isPauseRecovery, setIsPauseRecovery] = useState(false);
  const [resetAttempts, setResetAttempts] = useState(0);
  
  // Check if we need to use force bypass mode (completely skip auth checks)
  const bypassActive = isForceBypassActive();
  
  // Check for circuit breaker and auth loop issues
  const circuitBreakerInfo = isCircuitBreakerActive();
  const authLoopDetected = detectAuthLoops();
  const pauseDetected = wasPauseDetected();
  
  // Initialize pause/unpause detection on first render
  useEffect(() => {
    initPauseUnpauseDetection();
    
    // If we have bypass active, reset recovery attempts
    if (bypassActive) {
      resetRecoveryAttempts();
    }
    
    // Display message if coming back from pause
    if (pauseDetected) {
      console.log("🔄 Returning from app pause/background - using lenient auth checks");
      setIsPauseRecovery(true);
      
      // Auto-reset circuit breaker when coming back from pause
      resetCircuitBreaker();
      
      // Clear the pause detected flag after using it
      setTimeout(() => {
        clearPauseDetected();
        setIsPauseRecovery(false);
      }, 10000);
    }
  }, [bypassActive, pauseDetected]);
  
  // Add a longer timeout to force progression after 8 seconds max
  useEffect(() => {
    // Set a timeout to force progress after 8 seconds (up from 3)
    const timer = setTimeout(() => {
      if (!redirecting) {
        console.log("Force timeout triggered - progressing auth flow");
        setForceTimeout(true);
      }
    }, 8000);
    
    return () => clearTimeout(timer);
  }, [redirecting]);
  
  // Add new effect to handle the updated auth flow with raw token check
  useEffect(() => {
    if (loading) return;
    
    const hasValidSession = session && session.user;
    const rawTokenInStorage = localStorage.getItem(STORAGE_KEY);
    
    // If we have no valid session and no token, stay on auth page
    if (!hasValidSession && !rawTokenInStorage) {
      console.warn('No valid session and no token. Staying on auth page.');
      if (location.pathname !== '/auth') {
        setRedirecting(true);
        navigate('/auth', { replace: true });
      }
      return;
    }
    
    // If we have a valid session, navigate away from auth page
    if (hasValidSession) {
      if (location.pathname === '/auth') {
        setRedirecting(true);
        navigate('/', { replace: true });
      }
    }
  }, [loading, session, location.pathname, navigate]);
  
  // Handle recovery action
  const handleRecovery = async () => {
    // Track reset attempts to prevent endless recovery loops
    const newResetCount = resetAttempts + 1;
    setResetAttempts(newResetCount);
    
    // Circuit breaker for recovery attempts
    if (newResetCount >= 3) {
      console.warn("Too many recovery attempts, activating bypass");
      setForceBypass(3600000); // 1 hour bypass
      window.location.reload();
      return;
    }
    
    setIsRecovering(true);
    
    try {
      await performFullAuthRecovery();
      setRedirecting(true);
      // Add a cache-busting parameter
      window.location.href = '/auth?recovery=' + Date.now();
    } catch (err) {
      console.error("Recovery failed:", err);
      setIsRecovering(false);
      
      if (hasTooManyRecoveryAttempts()) {
        // If we've tried multiple times, activate bypass
        setForceBypass();
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
    // Add a cache-busting parameter with special force flag
    window.location.href = '/?force=' + Date.now();
  };
  
  // Handle force bypass activation
  const handleForceBypass = () => {
    setForceBypass();
    setForceTimeout(true);
    window.location.reload();
  };
  
  // If force bypass is active, skip all checks and render the outlet
  if (bypassActive) {
    console.log("🔓 Force bypass active - skipping auth checks");
    return <Outlet />;
  }
  
  // Show loading spinner while checking authentication - with increased timeout
  if ((loading && !forceTimeout) && !redirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
        
        {isPauseRecovery && (
          <p className="text-sm text-amber-500 mt-2 mb-2">
            Recovering from app pause/background state...
          </p>
        )}
        
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
          <Button
            variant="link"
            onClick={handleForceBypass}
            className="text-sm text-amber-500"
          >
            Bypass auth checks
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
              
              {isPauseRecovery && (
                <p className="mt-2 text-sm text-amber-500">
                  Possible Supabase service pause/unpause detected. Recovery measures activated.
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
              onClick={handleForceBypass}
              className="w-full mt-2"
            >
              Force Access Anyway (4 hrs)
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              If problems persist, try clearing your browser cache and cookies.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // IMPROVED CHECK: If we have a session OR isAuthenticated flag OR we're in force timeout,
  // OR we've detected a pause/unpause and want to be lenient, allow access
  if (session || isAuthenticated || forceTimeout || (isPauseRecovery && session)) {
    return <Outlet />;
  }
  
  // If definitely not authenticated, redirect to login with cache busting
  const redirectPath = encodeURIComponent(location.pathname);
  const cacheBuster = Date.now();
  window.location.href = `/auth?redirect=${redirectPath}&t=${cacheBuster}`;
  return null;
};

export default ProtectedRoute;
