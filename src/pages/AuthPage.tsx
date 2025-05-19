
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  clearAuthState, 
  isCircuitBreakerActive, 
  resetCircuitBreaker,
  detectAuthLoops,
  isTokenPotentiallyStale,
  recordSuccessfulAuth
} from '@/integrations/supabase/client';

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showRecovery, setShowRecovery] = useState<boolean>(false);
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [advancedTroubleshooting, setAdvancedTroubleshooting] = useState<boolean>(false);
  const [redirectAttempted, setRedirectAttempted] = useState<boolean>(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signIn, forceRecovery, authState, authError } = useAuth();
  
  // Get redirect path from state or default to home
  const from = location.state?.from || '/';
  
  // Check for auth issues on mount
  useEffect(() => {
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
    
    // After 3 seconds, show the troubleshooting option
    const timer = setTimeout(() => {
      setShowRecovery(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [authState]);
  
  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !redirectAttempted) {
      setRedirectAttempted(true);
      console.log("User is authenticated, redirecting to:", from);
      
      // Use a short timeout to ensure all state updates have processed
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    }
  }, [isAuthenticated, navigate, from, redirectAttempted]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    // Reset circuit breaker before sign in attempt
    resetCircuitBreaker();
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Mark successful authentication
      recordSuccessfulAuth();
      toast.success("You have been logged in");
      
      // Set the redirectAttempted flag to trigger the redirect in the useEffect
      setRedirectAttempted(false);
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
      // Reset circuit breaker
      resetCircuitBreaker();
      
      // Clear all auth state
      await clearAuthState();
      
      // Force recovery through auth context
      await forceRecovery();
      
      toast.success("Authentication reset successful", {
        description: "Please log in again"
      });
      
      // Reset states after recovery
      setLoading(false);
      setRecoveryMode(false);
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
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      
      toast.success("Complete browser storage reset successful", {
        description: "Reloading page..."
      });
      
      // Hard reload after short delay
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    } catch (err) {
      console.error('Hard reset failed:', err);
      toast.error("Reset failed", {
        description: "Please try clearing browser data manually"
      });
    }
  };
  
  const isAuthError = authState === 'ERROR' || !!authError;
  const circuitBreakerInfo = isCircuitBreakerActive();
  
  // If authenticated, show a loading screen during redirect
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">You are logged in. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Techlinx Helpdesk</CardTitle>
          <CardDescription>Sign in to access your support dashboard</CardDescription>
        </CardHeader>
        
        {(isAuthError || circuitBreakerInfo.active) && (
          <CardContent>
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
          </CardContent>
        )}
        
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
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
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || recoveryMode || circuitBreakerInfo.active}
            >
              {loading && !recoveryMode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
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
            
            {advancedTroubleshooting && (
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
            
            {!advancedTroubleshooting && showRecovery && (
              <Button
                type="button"
                variant="link"
                className="text-xs text-muted-foreground w-full mt-1"
                onClick={() => setAdvancedTroubleshooting(true)}
              >
                Advanced Troubleshooting Options
              </Button>
            )}
          </CardFooter>
        </form>
        
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
