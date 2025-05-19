import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader, AlertCircle } from 'lucide-react';
import { probeSupabaseService } from '@/utils/authRecovery';
import { toast } from 'sonner';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  const [lastRecoveryAttempt, setLastRecoveryAttempt] = useState(0);
  
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're in recovery mode
  const isRecoveryMode = location.search.includes('recovery') || 
                         location.search.includes('reset') ||
                         location.search.includes('mode=recovery');
  
  // Get redirect path from URL if available
  const getRedirectPath = () => {
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');
    return redirectPath || '/';
  };
  
  // Check Supabase service availability
  useEffect(() => {
    const checkService = async () => {
      try {
        const available = await probeSupabaseService();
        setServiceAvailable(available);
        
        if (!available) {
          console.warn('Supabase service unavailable - may be in cold start');
          setError('Service is currently starting up. Please wait a moment...');
          
          // Retry after 3 seconds
          setTimeout(async () => {
            const retryAvailable = await probeSupabaseService();
            setServiceAvailable(retryAvailable);
            
            if (retryAvailable) {
              setError(null);
            } else {
              setError('Service is still starting. This may take a few more seconds...');
            }
          }, 3000);
        }
      } catch (err) {
        console.error('Error checking service:', err);
        setServiceAvailable(false);
      }
    };
    
    checkService();
  }, []);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && !redirectInProgress) {
      // Check if we're in recovery mode - don't redirect immediately
      if (isRecoveryMode) {
        console.log("In recovery mode, delaying redirect");
        
        // Add a short delay before redirecting to avoid loops
        setTimeout(() => {
          setRedirectInProgress(true);
          navigate(getRedirectPath(), { replace: true });
        }, 1000);
        return;
      }
      
      // Normal redirect
      setRedirectInProgress(true);
      navigate(getRedirectPath(), { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location.search, isRecoveryMode, redirectInProgress]);
  
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
        console.error('Sign in error:', error);
        setError(error.message || 'Failed to sign in. Please check your credentials.');
        setIsLoading(false);
      } else {
        // Success - redirect will happen via the useEffect
        setError(null);
      }
    } catch (err: any) {
      console.error('Exception during sign in:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle recovery mode
  useEffect(() => {
    if (isRecoveryMode) {
      // Check if we've recently attempted recovery to prevent loops
      const now = Date.now();
      if (window.location.href.includes("recovery") && (now - lastRecoveryAttempt) < 3000) {
        console.log("Recovery already in progress, not repeating redirect.");
        return;
      }
      
      setLastRecoveryAttempt(now);
      console.log('Auth page loaded in recovery mode');
      toast.info("Authentication recovery mode", {
        description: "The system is recovering from an authentication issue."
      });
    }
  }, [isRecoveryMode, lastRecoveryAttempt]);
  
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
          
          {isRecoveryMode && (
            <Alert className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
              <AlertDescription>
                Recovery mode active. Please sign in again to restore your session.
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
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
