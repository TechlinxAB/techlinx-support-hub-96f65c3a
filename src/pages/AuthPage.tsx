
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, resetAuthState } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import navigationService from '@/services/navigationService';

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const location = useLocation();
  const { user, authState, signIn } = useAuth();
  
  // Get the redirect path from location state
  const from = location.state?.from || '/';
  const searchParams = new URLSearchParams(location.search);
  const cleanSession = searchParams.get('clean') === 'true';
  const forcedLogout = searchParams.get('forced') === 'true';
  const resetComplete = searchParams.get('reset') === 'complete';
  
  // Reset any stale auth state if requested
  useEffect(() => {
    if (cleanSession || resetComplete) {
      console.log('Clean session requested, resetting auth state');
      resetAuthState().then(() => {
        // Remove params to prevent infinite loops on page refresh
        if (window.history.replaceState) {
          const newUrl = window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }
      });
    }
    
    if (forcedLogout) {
      toast.info('You were logged out due to an authentication issue');
      // Remove the forced param
      if (window.history.replaceState) {
        const newUrl = window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [cleanSession, forcedLogout, resetComplete]);
  
  // Redirect if user is authenticated
  useEffect(() => {
    if (user && authState === 'AUTHENTICATED') {
      // Use a small timeout to allow the UI to update first
      const redirectTimeout = setTimeout(() => {
        navigationService.navigate(from);
      }, 300);
      
      return () => clearTimeout(redirectTimeout);
    }
  }, [user, authState, from]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      toast.success("You have been logged in");
      
      // Navigation will happen automatically via the effect above
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error.message);
      toast.error("Login failed", {
        description: error.message || "Invalid email or password"
      });
      setLoading(false);
    }
  };
  
  // Show loading state if auth is initializing
  if (authState === 'INITIALIZING') {
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
