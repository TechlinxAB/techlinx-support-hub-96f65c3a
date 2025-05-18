
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, resetAuthState } = useAuth();
  
  // Refs to prevent redirect loops
  const isRedirecting = useRef<boolean>(false);
  const lastRedirect = useRef<number>(0);
  const redirectAttempts = useRef<number>(0);
  
  // Get return URL from query params
  const getReturnUrl = () => {
    const returnUrl = searchParams.get('returnUrl');
    return returnUrl ? decodeURIComponent(returnUrl) : '/';
  };
  
  // Redirect authenticated users away from login page - with better controls
  useEffect(() => {
    // Prevent excessive redirects
    if (redirectAttempts.current > 5) {
      console.error("Too many redirect attempts from auth page. Stopping redirect cycle.");
      // Emergency reset of auth state if we're in a loop
      resetAuthState();
      return;
    }
    
    // Skip if loading or already redirecting
    if (status === 'LOADING' || isRedirecting.current) {
      return;
    }
    
    // Add cooldown between redirect attempts
    const now = Date.now();
    if (now - lastRedirect.current < 3000) {
      return;
    }
    
    // Only redirect if authenticated
    if (status === 'AUTHENTICATED') {
      console.log("User authenticated, redirecting away from auth page");
      isRedirecting.current = true;
      lastRedirect.current = now;
      redirectAttempts.current += 1;
      
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
      
      // Reset redirect flag after a delay
      setTimeout(() => {
        isRedirecting.current = false;
      }, 2000);
    }
  }, [status, navigate, resetAuthState]);
  
  // Reset redirect attempts when component unmounts
  useEffect(() => {
    return () => {
      redirectAttempts.current = 0;
    };
  }, []);
  
  // Handle errors more explicitly
  const handleError = (error: any) => {
    console.error("Sign in error:", error);
    
    // Specific error handling for common issues
    if (error.message?.includes('Email not confirmed')) {
      setErrorMessage("Please confirm your email address before signing in.");
      toast.error("Please confirm your email before signing in");
    } else if (error.message?.includes('Invalid login credentials')) {
      setErrorMessage("Invalid email or password");
      toast.error("Invalid email or password");
    } else {
      setErrorMessage(error.message || "Failed to sign in");
      toast.error(error.message || "Failed to sign in");
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage("Please fill in all fields");
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      
      // Add a small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log("Sign in successful");
      toast.success("You have been logged in");
      
      // Clear the form
      setEmail('');
      setPassword('');
      
      // Reset redirect attempts on successful login
      redirectAttempts.current = 0;
      
      // Auth state change will handle redirect automatically
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetAuthState = () => {
    resetAuthState();
    toast.info("Authentication state reset");
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Techlinx Helpdesk</CardTitle>
          <CardDescription>Sign in to access your support dashboard</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {errorMessage}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || status === 'LOADING'}
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
                disabled={loading || status === 'LOADING'}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={loading || status === 'LOADING'}>
              {(loading || status === 'LOADING') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            
            <Button type="button" variant="outline" className="w-full" onClick={handleResetAuthState}>
              Reset Auth State
            </Button>
          </CardFooter>
        </form>
        
        <CardFooter className="flex flex-col space-y-2 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground text-center">
            New users must be created by an administrator through the User Management page.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Auth Status: {status}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
