
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  isCircuitBreakerActive, 
  resetCircuitBreaker,
  isForceBypassActive,
  setForceBypass,
  initPauseUnpauseDetection,
  wasPauseDetected,
  clearPauseDetected,
  hasTooManyRecoveryAttempts,
  resetRecoveryAttempts,
  testSessionWithRetries,
  resetAuthLoopState,
  cleanAuthState,
  probeSupabaseService,
  detectAuthLoops,
  isPauseRecoveryRequired,
  clearPauseRecoveryRequired
} from '@/utils/authRecovery';
import { 
  supabase, 
  STORAGE_KEY, 
  validateTokenIntegrity 
} from '@/integrations/supabase/client';

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
  const [sessionTestResult, setSessionTestResult] = useState<{valid?: boolean; error?: string}>({});
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [redirectStarted, setRedirectStarted] = useState(false);
  
  // Check if we need to use force bypass mode (completely skip auth checks)
  const bypassActive = isForceBypassActive();
  
  // Check for circuit breaker and auth loop issues - with delay and throttling
  const circuitBreakerInfo = isCircuitBreakerActive();
  const [authLoopDetected, setAuthLoopDetected] = useState(false);
  const pauseDetected = wasPauseDetected();
  const pauseRecoveryRequired = isPauseRecoveryRequired();
  
  // Check for auth loops with throttling to prevent false positives
  useEffect(() => {
    if (loading) return;
    
    const loopCheck = () => {
      const isLoop = detectAuthLoops();
      if (isLoop) {
        console.warn("Authentication loop detected - taking mitigation actions");
        // Clear the pause recovery flags if loops are detected
        clearPauseRecoveryRequired();
        clearPauseDetected();
      }
      setAuthLoopDetected(isLoop);
    };
    
    // Only check for loops after 2 seconds to allow initial auth processes to complete
    // Increased from 1.5s to 2s for more stability
    const timer = setTimeout(loopCheck, 2000);
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Reset auth loop detection on navigation changes
  useEffect(() => {
    resetAuthLoopState();
  }, [location.pathname]);
  
  // Initialize pause/unpause detection on first render
  useEffect(() => {
    initPauseUnpauseDetection();
    
    // If we have bypass active, reset recovery attempts
    if (bypassActive) {
      resetRecoveryAttempts();
    }
    
    // Display message if coming back from pause
    if (pauseDetected || pauseRecoveryRequired) {
      console.log("🔄 Returning from app pause/background - using lenient auth checks");
      setIsPauseRecovery(true);
      
      // Check if we have a valid token in local storage
      const hasToken = validateTokenIntegrity();
      if (!hasToken) {
        console.warn("No valid token found after pause - immediate recovery required");
        handleRecovery();
      } else {
        // Auto-reset circuit breaker when coming back from pause
        resetCircuitBreaker();
        
        // Run session test with retries to ensure we have a valid session
        testSessionWithRetries(3).then(result => {
          setSessionTestResult(result);
          
          if (!result.valid) {
            console.warn("Session test failed after pause - recovery required");
            handleRecovery();
          } else {
            console.log("Session test passed after pause");
            // Clear the pause detected flag after using it
            clearPauseDetected();
            clearPauseRecoveryRequired();
            resetAuthLoopState();
          }
        });
      }
      
      // Clear the pause detected flag after a delay
      const timer = setTimeout(() => {
        clearPauseDetected();
        clearPauseRecoveryRequired();
        setIsPauseRecovery(false);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [bypassActive, pauseDetected, pauseRecoveryRequired]);
  
  // Add a longer timeout to force progression after 8 seconds max
  useEffect(() => {
    // Set a timeout to force progress after 10 seconds (up from 8)
    const timer = setTimeout(() => {
      if (!redirecting && !authCheckComplete) {
        console.log("Force timeout triggered - progressing auth flow");
        setForceTimeout(true);
        setAuthCheckComplete(true);
        
        // If we're timing out and still no session, force navigation to auth
        if (!session && location.pathname !== '/auth' && !redirectStarted) {
          console.log("Force timeout with no session - redirecting to auth");
          handleNavigateToAuth();
        }
      }
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [redirecting, authCheckComplete, session, location.pathname]);
  
  // Add new effect to handle the updated auth flow with raw token check
  useEffect(() => {
    if (loading) return;
    
    // Mark auth check as completed
    setAuthCheckComplete(true);
    
    const rawTokenInStorage = localStorage.getItem(STORAGE_KEY);
    const isSessionValid = session?.user && rawTokenInStorage;
    
    // If we don't have a valid session or token, stay on auth page
    if (!isSessionValid && !bypassActive) {
      console.warn('Invalid session or missing token. Routing to /auth.');
      if (location.pathname !== '/auth' && !redirectStarted) {
        setRedirectStarted(true);
        setRedirecting(true);
        navigate('/auth', { replace: true, state: { from: location.pathname } });
      }
      return;
    }
    
    // If we have a valid session, navigate away from auth page
    if ((isSessionValid || bypassActive) && location.pathname === '/auth' && !redirectStarted) {
      setRedirectStarted(true);
      setRedirecting(true);
      navigate('/', { replace: true });
    }
  }, [loading, session, location.pathname, navigate, bypassActive, redirectStarted]);
  
  // Handle recovery action - enhanced for pause recovery
  const handleRecovery = async () => {
    // Check if we're already in recovery mode
    if (isRecovering) return;
    
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
      // First check if Supabase is available 
      for (let i = 0; i < 2; i++) {
        const available = await probeSupabaseService();
        if (available) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Clean auth state completely
      await cleanAuthState({ signOut: true });
      
      setRedirecting(true);
      // Add a cache-busting parameter
      window.location.href = '/auth?recovery=' + Date.now();
    } catch (err) {
      console.error("Recovery failed:", err);
      setIsRecovering(false);
      
      if (hasTooManyRecoveryAttempts()) {
        // If we've tried multiple times, activate bypass
        setForceBypass(3600000); // 1 hour
        // Force reload page
        window.location.reload();
      }
    }
  };
  
  // Handle forcing auth page navigation
  const handleNavigateToAuth = () => {
    if (redirectStarted) return; // Prevent duplicate redirects
    
    setRedirectStarted(true);
    setRedirecting(true);
    resetCircuitBreaker();
    resetAuthLoopState();
    clearPauseRecoveryRequired(); 
    clearPauseDetected();
    
    // Add a cache-busting parameter
    window.location.href = '/auth?redirect=' + encodeURIComponent(location.pathname) + '&t=' + Date.now();
  };
  
  // Handle force dashboard navigation
  const handleForceDashboard = () => {
    if (redirectStarted) return; // Prevent duplicate redirects
    
    setRedirectStarted(true);
    setRedirecting(true);
    resetCircuitBreaker();
    resetAuthLoopState();
    clearPauseRecoveryRequired();
    clearPauseDetected();
    
    // Add a cache-busting parameter with special force flag
    window.location.href = '/?force=' + Date.now();
  };
  
  // Handle force bypass activation
  const handleForceBypass = () => {
    setForceBypass(3600000); // 1 hour
    resetAuthLoopState();
    clearPauseRecoveryRequired();
    clearPauseDetected();
    setForceTimeout(true);
    window.location.reload();
  };
  
  // If force bypass is active, skip all checks and render the outlet
  if (bypassActive) {
    console.log("🔓 Force bypass active - skipping auth checks");
    return <Outlet />;
  }
  
  // Show loading spinner while checking authentication - with increased timeout
  if ((loading && !forceTimeout) && !redirecting && !authCheckComplete) {
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
  if (authState === 'ERROR' || circuitBreakerInfo.active || authLoopDetected ||
      pauseRecoveryRequired || (sessionTestResult && !sessionTestResult.valid)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {authError || circuitBreakerInfo.reason || sessionTestResult.error || 
                (authLoopDetected ? "Authentication loop detected. The system will reset to resolve this issue." : 
                "There was a problem with authentication. This might be due to a stale session.")}
              
              {circuitBreakerInfo.active && circuitBreakerInfo.remainingSeconds && (
                <p className="mt-2 text-sm">
                  Authentication temporarily disabled for{' '}
                  {Math.floor(circuitBreakerInfo.remainingSeconds / 60)} minutes and{' '}
                  {circuitBreakerInfo.remainingSeconds % 60} seconds.
                </p>
              )}
              
              {authLoopDetected && (
                <p className="mt-2 text-sm">
                  The system detected multiple authentication attempts in rapid succession.
                  This is usually caused by a stale session or token. Click "Reset Authentication" below to fix this.
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
              {isRecovering && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
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
              Force Access Anyway (1 hr)
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              If problems persist, try clearing your browser cache and cookies.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Use our improved check - if we have a valid session AND token, allow access
  const rawTokenInStorage = localStorage.getItem(STORAGE_KEY);
  const isSessionValid = session?.user && rawTokenInStorage;
  
  if (isSessionValid || forceTimeout || (isPauseRecovery && session)) {
    return <Outlet />;
  }
  
  // If definitely not authenticated, redirect to login with cache busting
  if (!loading && !redirecting && authCheckComplete && !redirectStarted) {
    setRedirectStarted(true);
    const redirectPath = encodeURIComponent(location.pathname);
    const cacheBuster = Date.now();
    console.log("Not authenticated and auth check complete - redirecting to login");
    window.location.href = `/auth?redirect=${redirectPath}&t=${cacheBuster}`;
  }
  
  // Show loading while we execute redirect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Redirecting to login...</p>
    </div>
  );
};

export default ProtectedRoute;
