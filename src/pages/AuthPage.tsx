
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, resetAuthState } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the redirect path from location state
  const from = location.state?.from || '/';
  const searchParams = new URLSearchParams(location.search);
  const cleanSession = searchParams.get('clean') === 'true';
  const forcedLogout = searchParams.get('forced') === 'true';
  const redirectTriggered = React.useRef(false);
  
  // Reset any stale auth state that might cause issues
  useEffect(() => {
    // If ?clean=true is in the URL, this was a manual logout so ensure clean state
    if (cleanSession) {
      console.log('Clean session requested, resetting auth state');
      resetAuthState().then(() => {
        // Remove the clean param to prevent infinite loops on page refresh
        if (window.history.replaceState) {
          const newUrl = window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }
      });
    }
    
    if (forcedLogout) {
      toast.info('You were logged out due to an authentication issue');
      // Remove the forced param to prevent showing the message on refresh
      if (window.history.replaceState) {
        const newUrl = window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [cleanSession, forcedLogout]);
  
  // Check if user is already logged in
  useEffect(() => {
    let isMounted = true;
    let redirectTimeout: number;
    
    // First clear any potential broken auth state on auth page loads
    const clearBrokenState = async () => {
      try {
        // Check if we have a session with invalid tokens causing 401s
        const storage = localStorage.getItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
        if (storage && (storage.includes('error') || storage.includes('401'))) {
          console.log('Found potentially corrupted auth state, cleaning up');
          localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    };
    
    clearBrokenState();
    
    // Add a small delay to avoid race conditions with multiple auth checks
    const timeoutId = setTimeout(() => {
      const checkSession = async () => {
        if (redirectTriggered.current) {
          console.log('Redirect already triggered, skipping session check');
          return;
        }
        
        try {
          console.log('Checking for existing session...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session check error:', error);
            if (isMounted) {
              setAuthError(error.message);
              toast.error("Authentication error", {
                description: error.message
              });
            }
            setCheckingSession(false);
          } else if (data.session && isMounted) {
            console.log('Active session found, redirecting to:', from);
            
            // Prevent multiple redirects
            if (!redirectTriggered.current) {
              redirectTriggered.current = true;
              
              // Use a small timeout to prevent immediate redirect that can cause loops
              redirectTimeout = window.setTimeout(() => {
                if (isMounted) {
                  try {
                    console.log('Navigating to:', from);
                    navigate(from);
                    
                    // If still on auth page after navigation attempt,
                    // we'll fall back but add a longer delay to avoid loops
                    setTimeout(() => {
                      if (window.location.pathname === '/auth' && isMounted && redirectTriggered.current) {
                        console.log('Still on auth page after navigate, falling back to direct redirect');
                        redirectTriggered.current = false; // Reset to allow one more try
                        window.location.href = from;
                      }
                    }, 1000);
                  } catch (navError) {
                    console.error('Navigation error:', navError);
                    // Fallback to direct navigation
                    window.location.href = from;
                  }
                }
              }, 500);
            }
          } else {
            console.log('No active session found, showing login form');
            setCheckingSession(false);
          }
        } catch (error) {
          console.error('Exception during session check:', error);
          setCheckingSession(false);
        }
      };
      
      checkSession();
    }, 200);
    
    // Clean up function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(redirectTimeout);
    };
  }, [navigate, from]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Attempting to sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('Sign in successful:', data.session ? 'Session exists' : 'No session');
      toast.success("You have been logged in");
      
      // Allow the toast to show before redirect
      setTimeout(() => {
        try {
          // Use window.location for more reliable redirect after login
          window.location.href = from === '/' ? '/' : from;
        } catch (navError) {
          console.error('Navigation error after login:', navError);
          window.location.href = '/';
        }
      }, 300);
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error.message);
      toast.error("Login failed", {
        description: error.message || "Invalid email or password"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading state while checking the session
  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
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
        
        {authError && (
          <div className="mx-6 mb-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {authError}
          </div>
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
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </CardFooter>
        </form>
        
        <CardFooter className="flex flex-col space-y-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground text-center">
            New users must be created by an administrator through the User Management page.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
