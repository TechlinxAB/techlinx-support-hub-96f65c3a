
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [error, setError] = useState<string>('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, debug } = useAuth();
  const redirectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Get return URL from query params or default to home
  const getReturnUrl = () => {
    const returnUrl = searchParams.get('returnUrl');
    return returnUrl ? decodeURIComponent(returnUrl) : '/';
  };
  
  // Redirect authenticated users away from login page
  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    
    // Only redirect if we're definitely authenticated
    // And don't redirect during loading state
    if (status === 'AUTHENTICATED') {
      // Add a delay to ensure auth state is stable before redirecting
      redirectTimeoutRef.current = setTimeout(() => {
        const returnUrl = getReturnUrl();
        console.log(`User authenticated, redirecting to ${returnUrl}`);
        navigate(returnUrl, { replace: true });
      }, 100);
    }
    
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [status, navigate]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      toast.success("Login successful");
      
      // Auth state change will trigger the redirect in the useEffect
    } catch (error: any) {
      console.error("Login error:", error);
      
      if (error.message?.includes('Invalid login credentials')) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
      } else {
        setError(error.message || "Login failed");
        toast.error(error.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
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
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            
            {/* Add debug info for development purposes */}
            <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-1">
              <div>Auth Status: {status}</div>
              <div>Last Event: {debug.lastEvent || 'none'} {debug.lastEventTime ? `at ${debug.lastEventTime.toLocaleTimeString()}` : ''}</div>
              <div>Session Check: {debug.sessionCheck ? 'Completed' : 'Pending'}</div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || status === 'LOADING'}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
