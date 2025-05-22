
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the redirect URL from query parameters
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/';
  
  // Check Supabase service availability
  useEffect(() => {
    const checkService = async () => {
      try {
        const startTime = Date.now();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        const responseTime = Date.now() - startTime;
        
        // If response time is very slow, service might be starting up
        const isAvailable = !error && responseTime < 3000;
        setServiceAvailable(isAvailable);
        
        if (!isAvailable) {
          console.warn('Supabase service unavailable or slow - may be in cold start');
          setError('Service is currently starting up. Please wait a moment...');
          
          // Retry after 3 seconds
          setTimeout(checkService, 3000);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error checking service:', err);
        setServiceAvailable(false);
        setError('Service is currently unavailable. Please try again later.');
      }
    };
    
    checkService();
  }, []);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Navigate to the redirect path instead of hardcoded '/'
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectPath]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceAvailable) {
      toast.error("Service is currently unavailable", {
        description: "Please wait a moment while the service starts up."
      });
      return;
    }
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message || 'Failed to sign in. Please check your credentials.');
      }
      // No need to navigate here, the useEffect will handle it
    } catch (err: any) {
      console.error('Exception during sign in:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Hard reset function for complete auth reset
  const hardReset = async () => {
    try {
      setIsLoading(true);
      
      // Sign out first
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear auth-related storage
      localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      
      toast.success("Auth state has been reset", {
        description: "Please try logging in again."
      });
      
      // Force page reload to ensure clean state
      window.location.href = '/auth';
    } catch (err) {
      console.error('Error during hard reset:', err);
      toast.error("Reset failed", {
        description: "Please try refreshing the page."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!serviceAvailable && (
            <Alert className="mb-4 bg-amber-100 text-amber-800 border-amber-200">
              <AlertDescription>
                The service is currently starting up. This may take a few moments.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !serviceAvailable}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || !serviceAvailable}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !serviceAvailable}
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center w-full">
            Forgot your password? Please contact your administrator.
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-2" 
            onClick={hardReset}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Hard Reset Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
