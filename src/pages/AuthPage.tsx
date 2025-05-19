
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, validateTokenIntegrity } from "@/integrations/supabase/client";
import { useToast } from '@/components/ui/use-toast';
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw, Shield, Power, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  isCircuitBreakerActive, 
  resetCircuitBreaker 
} from '@/integrations/supabase/client';
import { 
  detectAuthLoops,
  isTokenPotentiallyStale,
  performFullAuthRecovery, 
  emergencyAuthReset,
  testSessionWithRetries,
  probeSupabaseService,
  clearPauseDetected,
  resetAuthRecovery,
  cleanAuthState,
  isPauseRecoveryRequired,
  clearPauseRecoveryRequired
} from '@/utils/authRecovery';

/**
 * Records a successful authentication
 */
const recordSuccessfulAuth = () => {
  try {
    // Reset any error counters
    localStorage.setItem('auth-error-count', '0');
    
    // Record successful login timestamp
    const successfulLogins = JSON.parse(localStorage.getItem('successful-logins') || '[]');
    successfulLogins.push(Date.now());
    
    // Keep only recent logins (last 10)
    if (successfulLogins.length > 10) {
      successfulLogins.splice(0, successfulLogins.length - 10);
    }
    
    localStorage.setItem('successful-logins', JSON.stringify(successfulLogins));
    console.log('Successful authentication recorded');
  } catch (error) {
    console.error('Error recording successful auth:', error);
  }
};

// Nuclear option - completely clear auth state and retry
const hardResetLogin = async () => {
  try {
    console.log("Performing HARD RESET on authentication state");
    toast.info("Performing complete authentication reset");
    
    // Sign out first
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Preserve theme if possible
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    
    // Force reload with cache busting
    window.location.href = '/auth?hardReset=' + Date.now();
  } catch (error) {
    console.error("Hard reset failed:", error);
    // Last resort - reload page
    window.location.reload();
  }
};

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showRecovery, setShowRecovery] = useState<boolean>(false);
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [advancedTroubleshooting, setAdvancedTroubleshooting] = useState<boolean>(false);
  const [redirectAttempted, setRedirectAttempted] = useState<boolean>(false);
  const [forceHomeRedirect, setForceHomeRedirect] = useState<boolean>(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'available' | 'unavailable' | 'recovering'>('checking');
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [pauseRecoveryNeeded, setPauseRecoveryNeeded] = useState<boolean>(false);
  const [probeAttempts, setProbeAttempts] = useState<number>(0);
  const [hasTriedAutoRecover, setHasTriedAutoRecover] = useState<boolean>(false);
  const [lastProbeTime, setLastProbeTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signIn, forceRecovery, authState, authError, session } = useAuth();
  
  // Get redirect path from state or query param or default to home
  const urlParams = new URLSearchParams(location.search);
  const redirectParam = urlParams.get('redirect');
  const recoveryParam = urlParams.get('recovery');
  const hardResetParam = urlParams.get('hardReset');
  const from = location.state?.from || redirectParam || '/';
  
  // Reset retry counter when URL changes
  useEffect(() => {
    setRetryCount(0);
  }, [location.search]);
  
  // Handle hard reset param
  useEffect(() => {
    if (hardResetParam) {
      console.log("Hard reset detected, resetting all auth state");
      // Clear any remaining flags
      clearPauseRecoveryRequired();
      clearPauseDetected();
      resetCircuitBreaker();
      resetAuthRecovery();
      
      // Show advanced troubleshooting options
      setAdvancedTroubleshooting(true);
      toast.info("Authentication state has been completely reset");
    }
  }, [hardResetParam]);
  
  // Add automatic recovery after Supabase pause
  useEffect(() => {
    // Check if this is loading from a recovery redirect
    if (recoveryParam && !hasTriedAutoRecover) {
      console.log("Recovery param detected, performing automatic recovery");
      setHasTriedAutoRecover(true);
      handleAutoRecovery();
    }
  }, [recoveryParam, hasTriedAutoRecover]);
  
  // Auto-recovery function for returning after pause
  const handleAutoRecovery = async () => {
    try {
      setServiceStatus('recovering');
      
      // Clear any pause recovery flags
      clearPauseRecoveryRequired();
      clearPauseDetected();
      
      // Clean auth state before checking availability
      await cleanAuthState({ signOut: false, preserveTheme: true });
      
      setTimeout(() => probeSupabaseService().then(isAvailable => {
        if (isAvailable) {
          setServiceStatus('available');
          setPauseRecoveryNeeded(false);
        } else {
          setServiceStatus('unavailable');
        }
      }), 1000);
    } catch (err) {
      console.error("Auto-recovery failed:", err);
    }
  };
  
  // Force clear pause recovery flags if we're on auth page
  useEffect(() => {
    const checkSupabaseServiceStatus = async () => {
      // Prevent hammering the service
      const now = Date.now();
      if (now - lastProbeTime < 2000) {
        console.log('Skipping service check - too soon after last check');
        return;
      }
      
      setLastProbeTime(now);
      setServiceStatus('checking');
      
      // Try to probe Supabase service
      const isAvailable = await probeSupabaseService();
      
      if (isAvailable) {
        console.log('Supabase service is available, clearing pause recovery flags');
        clearPauseRecoveryRequired();
        clearPauseDetected();
        setServiceStatus('available');
        setPauseRecoveryNeeded(false);
        setRecoveryMode(false);
      } else {
        // If service is not available, keep trying
        setServiceStatus('unavailable');
        setProbeAttempts(prev => prev + 1);
        setPauseRecoveryNeeded(true);
        
        // Only show recovery UI after multiple failed attempts
        if (probeAttempts >= 2) {
          setShowRecovery(true);
        }
        
        // Set up a retry after 3 seconds
        setTimeout(() => {
          if (serviceStatus !== 'available') {
            checkSupabaseServiceStatus();
          }
        }, 3000);
      }
    };
    
    // Initial check
    checkSupabaseServiceStatus();
  }, []);
  
  // Add a diagnostics run on page load
  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        console.log("Running auth diagnostics...");
        
        // First check for pause recovery mode
        if (isPauseRecoveryRequired()) {
          console.log("⚠️ Pause recovery required flag detected");
          setServiceStatus('recovering');
          setShowRecovery(true);
          setAdvancedTroubleshooting(true);
          setPauseRecoveryNeeded(true);
          
          // Try to probe if Supabase is actually available
          const isAvailable = await probeSupabaseService();
          if (isAvailable) {
            console.log('Supabase service is actually available despite pause flag, clearing flags');
            clearPauseRecoveryRequired();
            clearPauseDetected();
            setServiceStatus('available');
            setPauseRecoveryNeeded(false);
            setRecoveryMode(false);
          }
        }
        
        // Check if we have a valid token in storage
        const hasValidToken = validateTokenIntegrity();
        console.log(`Token integrity check: ${hasValidToken ? 'VALID' : 'INVALID'}`);
        
        // Run a service check
        const result = await testSessionWithRetries(2);
        setSessionValid(result.valid);
        
        if (result.valid) {
          console.log("✅ Session test: VALID");
          setServiceStatus('available');
          clearPauseRecoveryRequired();
          clearPauseDetected();
          setPauseRecoveryNeeded(false);
          
          // If we get here with a valid session AND token, but no authState,
          // something is wrong - trigger recovery
          if (!session && hasValidToken) {
            console.warn("⚠️ Token exists but no active session. Triggering recovery.");
            setShowRecovery(true);
          }
        } else {
          console.warn("❌ Session test: INVALID", result.error);
          setServiceStatus('unavailable');
          setShowRecovery(true);
          
          // Try to probe if service is actually available despite session failures
          const isAvailable = await probeSupabaseService();
          if (isAvailable) {
            setServiceStatus('available');
            clearPauseRecoveryRequired();
            clearPauseDetected();
            setPauseRecoveryNeeded(false);
          }
        }
      } catch (error) {
        console.error("Error during diagnostics:", error);
        setServiceStatus('unavailable');
        setShowRecovery(true);
        
        // Retry after failure
        setTimeout(() => {
          probeSupabaseService().then(available => {
            if (available) {
              setServiceStatus('available');
              clearPauseRecoveryRequired();
              clearPauseDetected();
              setPauseRecoveryNeeded(false);
            }
          });
        }, 3000);
      }
    };
    
    // Run diagnostics on load
    runDiagnostics();
  }, [session]);
  
  // Add an emergency force redirect function
  const handleForceRedirect = () => {
    setForceHomeRedirect(true);
    // Clear any pause recovery flags before redirecting
    clearPauseRecoveryRequired();
    clearPauseDetected();
    resetAuthRecovery();
    window.location.href = '/?force=' + Date.now();
  };
  
  // Check for auth issues on mount
  useEffect(() => {
    // Auto-reset the circuit breaker when on login page for a fresh start
    resetCircuitBreaker();
    
    const checkForAuthIssues = () => {
      const circuitBreakerInfo = isCircuitBreakerActive();
      const staleToken = isTokenPotentiallyStale();
      const loopDetected = detectAuthLoops();
      
      // Show recovery options if any issues detected
      if (circuitBreakerInfo.active || staleToken || loopDetected) {
        setShowRecovery(true);
        
        // Auto show advanced troubleshooting for serious issues
        if (loopDetected || (circuitBreakerInfo.active && circuitBreakerInfo.reason)) {
          setAdvancedTroubleshooting(true);
        }
      }
      
      // Log diagnostic info for debugging
      console.log("Auth diagnostics:", { 
        circuitBreaker: circuitBreakerInfo,
        staleToken, 
        loopDetected, 
        authState 
      });
    };
    
    checkForAuthIssues();
    
    // After 2 seconds, show the troubleshooting option
    const timer = setTimeout(() => {
      setShowRecovery(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [authState]);
  
  // Enhanced redirect logic with safety mechanisms
  useEffect(() => {
    // If we have a session, we should go to the homepage regardless
    if (session) {
      console.log("Session exists, forcing redirect to /");
      window.location.href = "/?session=" + Date.now();
      return;
    }
    
    if ((isAuthenticated || forceHomeRedirect) && !redirectAttempted) {
      setRedirectAttempted(true);
      console.log("User is authenticated, redirecting to:", from);
      
      // Use hard redirect for reliability with cache busting
      window.location.href = from + (from.includes('?') ? '&' : '?') + 'auth=' + Date.now();
    }
  }, [isAuthenticated, navigate, from, redirectAttempted, session, forceHomeRedirect]);
  
  // Manual retry handler
  const handleRetryConnection = async () => {
    setServiceStatus('checking');
    
    try {
      const isAvailable = await probeSupabaseService();
      if (isAvailable) {
        console.log('Retry successful - Supabase service is available');
        clearPauseRecoveryRequired();
        clearPauseDetected();
        setServiceStatus('available');
        setPauseRecoveryNeeded(false);
        setRecoveryMode(false);
      } else {
        console.log('Retry failed - Supabase service still unavailable');
        setServiceStatus('unavailable');
      }
    } catch (error) {
      console.error('Error during manual retry:', error);
      setServiceStatus('unavailable');
    }
  };

  // Handle login with retries and improved error handling
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    // Check for too many attempts and apply backoff
    if (retryCount > 0) {
      const backoffMs = Math.min(Math.pow(2, retryCount) * 1000, 8000); // Max 8 seconds
      toast.info(`Please wait ${backoffMs/1000} seconds before trying again`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    // Increment retry counter
    setRetryCount(prev => prev + 1);
    
    // Reset circuit breaker before sign in attempt
    resetCircuitBreaker();
    clearPauseRecoveryRequired();
    clearPauseDetected();
    setLoading(true);
    
    try {
      // Always probe service first to ensure it's available
      const isAvailable = await probeSupabaseService();
      if (!isAvailable) {
        toast.error("Login service is currently unavailable", {
          description: "The service might be starting up. Please try again in a moment."
        });
        setServiceStatus('unavailable');
        setPauseRecoveryNeeded(true);
        setLoading(false);
        return;
      }
      
      // Clean auth state first to remove any stale tokens
      await cleanAuthState({ signOut: false });
      
      // Proceed with login if service is available
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Mark successful authentication
      recordSuccessfulAuth();
      toast.success("You have been logged in");
      clearPauseRecoveryRequired();
      clearPauseDetected();
      
      // Force a hard redirect after successful login with cache busting
      setTimeout(() => {
        window.location.href = from + (from.includes('?') ? '&' : '?') + 'login=' + Date.now();
      }, 300);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error("Login failed", {
        description: error.message || "Invalid email or password"
      });
      setShowRecovery(true);
      setLoading(false);
    }
  };
  
  const handleRecovery = async () => {
    setLoading(true);
    setRecoveryMode(true);
    
    try {
      // Reset circuit breaker first
      resetCircuitBreaker();
      
      // Use the enhanced recovery function
      await performFullAuthRecovery();
      
      toast.success("Authentication reset successful", {
        description: "Please log in again"
      });
      
      // Force reload after recovery with cache busting
      setTimeout(() => {
        window.location.href = '/auth?recovery=' + Date.now();
      }, 300);
    } catch (err) {
      console.error('Recovery failed:', err);
      toast.error("Recovery failed", {
        description: "Please try clearing your browser cache and cookies"
      });
      setLoading(false);
      setRecoveryMode(false);
    }
  };
  
  const handleHardReset = () => {
    // Use the nuclear option function
    hardResetLogin();
  };
  
  // New function to specifically handle Supabase pause recovery
  const handlePauseRecovery = async () => {
    setServiceStatus('recovering');
    setLoading(true);
    
    try {
      // Clear recovery flags first
      clearPauseRecoveryRequired();
      clearPauseDetected();
      
      // Reset auth state (but don't try to sign out, might fail if Supabase is paused)
      await cleanAuthState({ signOut: false });
      
      // Try probing the service several times with increasing delays
      let isAvailable = false;
      for (let i = 0; i < 3; i++) {
        // Wait 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        isAvailable = await probeSupabaseService();
        if (isAvailable) break;
      }
      
      if (isAvailable) {
        toast.success("Supabase service is now available", {
          description: "You can now log in"
        });
        setServiceStatus('available');
        setPauseRecoveryNeeded(false);
      } else {
        toast.error("Supabase service is still unavailable", {
          description: "Please try again later"
        });
        setServiceStatus('unavailable');
      }
    } catch (error) {
      console.error("Pause recovery failed:", error);
      toast.error("Recovery failed", {
        description: "Please try again later"
      });
      setServiceStatus('unavailable');
    } finally {
      setLoading(false);
      setRecoveryMode(false);
    }
  };
  
  const isAuthError = authState === 'ERROR' || !!authError;
  const circuitBreakerInfo = isCircuitBreakerActive();
  
  // If authenticated and in a loading process, show a spinner
  if (isAuthenticated && redirectAttempted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">You are logged in. Redirecting to {from}...</p>
            <Button 
              variant="link" 
              onClick={handleForceRedirect}
              className="mt-4"
            >
              Click here if not automatically redirected
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If we have a session but not fully authenticated yet, show a spinner with force option
  if (session && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">Finalizing authentication...</p>
            <Button 
              variant="link" 
              onClick={handleForceRedirect}
              className="mt-4"
            >
              Click here to force redirect to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show service status indicator when needed
  const renderServiceStatusIndicator = () => {
    if (serviceStatus === 'checking') {
      return (
        <div className="mb-4 p-2 rounded border bg-blue-50 border-blue-200 text-blue-700">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-2"></div>
            <span className="text-sm font-medium">Checking Supabase service status...</span>
          </div>
        </div>
      );
    }
    
    if (serviceStatus === 'available') {
      return (
        <div className="mb-4 p-2 rounded border bg-green-50 border-green-200 text-green-700">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm font-medium">Supabase service is operational</span>
          </div>
        </div>
      );
    }
    
    if (serviceStatus === 'recovering') {
      return (
        <div className="mb-4 p-2 rounded border bg-amber-50 border-amber-200 text-amber-700">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-amber-500 mr-2"></div>
              <span className="text-sm font-medium">Recovery in progress</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryConnection} 
              className="text-xs px-2 py-1 h-auto"
            >
              Check Again
            </Button>
          </div>
          <p className="text-xs mt-1">
            Service may be recovering from pause. Automatic reconnection in progress.
          </p>
        </div>
      );
    }
    
    // Unavailable status
    return (
      <div className="mb-4 p-2 rounded border bg-red-50 border-red-200 text-red-700">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm font-medium">Supabase service may be restarting</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetryConnection} 
            className="text-xs px-2 py-1 h-auto"
          >
            Retry
          </Button>
        </div>
        <p className="text-xs mt-1">
          Service may be recovering from pause. Click "Retry" to check again.
        </p>
      </div>
    );
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Techlinx Helpdesk</CardTitle>
          <CardDescription>Sign in to access your support dashboard</CardDescription>
        </CardHeader>
        
        <CardContent>
          {renderServiceStatusIndicator()}
          
          {(isAuthError || circuitBreakerInfo.active) && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>
                {authError || circuitBreakerInfo.reason || "Authentication error. This could be due to a stale session."}
                
                {circuitBreakerInfo.active && circuitBreakerInfo.remainingSeconds && (
                  <p className="mt-2 text-sm">
                    Authentication is temporarily disabled for{' '}
                    {Math.floor(circuitBreakerInfo.remainingSeconds / 60)} minutes and{' '}
                    {circuitBreakerInfo.remainingSeconds % 60} seconds due to repeated errors.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {(isAuthError || circuitBreakerInfo.active || serviceStatus === 'recovering' || pauseRecoveryNeeded) && (
            <Button 
              onClick={handleRecovery} 
              variant="secondary"
              className="w-full mb-4"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reset Authentication
            </Button>
          )}
          
          {pauseRecoveryNeeded && (
            <Button 
              onClick={handlePauseRecovery} 
              variant="secondary"
              className="w-full mb-4"
              disabled={loading || serviceStatus === 'checking'}
              color="amber"
            >
              {loading && serviceStatus === 'recovering' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              Restore After Supabase Pause
            </Button>
          )}
          
          <form onSubmit={handleSignIn}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col space-y-3 mt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || recoveryMode || serviceStatus === 'checking' || 
                  ((circuitBreakerInfo.active && !advancedTroubleshooting) || 
                  (serviceStatus === 'unavailable' && pauseRecoveryNeeded))}
              >
                {loading && !recoveryMode ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full" 
                onClick={handleForceRedirect}
              >
                Go to Dashboard
              </Button>
              
              {showRecovery && !isAuthError && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full text-sm"
                  onClick={handleRecovery}
                  disabled={loading || recoveryMode}
                >
                  {recoveryMode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Troubleshoot Login
                </Button>
              )}
              
              {/* New Hard Reset Login Button - always visible in advanced mode */}
              {advancedTroubleshooting && (
                <Button
                  type="button" 
                  variant="destructive"
                  className="w-full text-sm"
                  onClick={handleHardReset}
                  disabled={loading}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Hard Reset Login
                </Button>
              )}
              
              {(advancedTroubleshooting || serviceStatus === 'unavailable') && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full text-sm mt-3"
                  onClick={handleHardReset}
                  disabled={loading}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Complete Reset (Clear All Data)
                </Button>
              )}
              
              {!advancedTroubleshooting && showRecovery && serviceStatus !== 'unavailable' && (
                <Button
                  type="button"
                  variant="link"
                  className="text-xs text-muted-foreground w-full mt-1"
                  onClick={() => setAdvancedTroubleshooting(true)}
                >
                  Advanced Troubleshooting Options
                </Button>
              )}
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground text-center">
            New users must be created by an administrator through the User Management page.
          </p>
          
          {showRecovery && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Having trouble logging in? Try the "Troubleshoot Login" option above or clear your browser cache.
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
