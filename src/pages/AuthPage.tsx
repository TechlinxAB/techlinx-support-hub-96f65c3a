
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  
  // Refs to prevent redirect loops
  const isRedirecting = useRef(false);
  const lastRedirect = useRef(0);
  
  // Get return URL from query params
  const getReturnUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.get('returnUrl') || '/';
  };
  
  // Redirect authenticated users away from login page - with better controls
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // Skip if already processing a redirect
    if (isRedirecting.current) return;
    
    // Skip if recently attempted a redirect
    const now = Date.now();
    if (now - lastRedirect.current < 3000) return;
    
    if (user) {
      console.log("User already authenticated, redirecting away from auth page");
      isRedirecting.current = true;
      lastRedirect.current = now;
      
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
      
      // Reset redirect flag after a delay
      setTimeout(() => {
        isRedirecting.current = false;
      }, 1000);
    }
  }, [user, authLoading, navigate, location]);
  
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log("Sign in successful");
      toast.success("You have been logged in");
      
      // Auth state change will handle redirect automatically
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      setErrorMessage(error.message || "Invalid email or password");
      toast.error(error.message || "Invalid email or password");
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
                disabled={loading || authLoading}
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
                disabled={loading || authLoading}
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || authLoading}>
              {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
