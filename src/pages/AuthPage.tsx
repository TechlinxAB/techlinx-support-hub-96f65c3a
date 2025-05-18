
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Simple state tracker
const AUTH_PAGE = {
  redirecting: false,
  lastRedirectTime: 0,
  redirectCooldown: 5000 // Long cooldown to prevent loops
};

const AuthPage = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  
  // Get return URL from query params
  const getReturnUrl = () => {
    const params = new URLSearchParams(location.search);
    return params.get('returnUrl') || '/';
  };
  
  // Redirect authenticated users away from login page
  useEffect(() => {
    if (AUTH_PAGE.redirecting) return;
    
    if (user) {
      // Apply cooldown
      const now = Date.now();
      if (now - AUTH_PAGE.lastRedirectTime < AUTH_PAGE.redirectCooldown) return;
      
      console.log("User already authenticated, redirecting away from auth page");
      AUTH_PAGE.lastRedirectTime = now;
      AUTH_PAGE.redirecting = true;
      
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
      
      // Reset redirect flag after a delay
      setTimeout(() => {
        AUTH_PAGE.redirecting = false;
      }, 1000);
    }
  }, [user, navigate, location]);
  
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
      
      // Redirect will happen automatically through auth state change
      
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
                required
                disabled={loading}
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
