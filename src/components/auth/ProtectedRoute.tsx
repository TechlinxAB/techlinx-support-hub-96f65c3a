
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { status, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for tracking redirect state
  const isRedirecting = useRef(false);
  const toastShown = useRef(false);
  const lastAttempt = useRef(0);
  const redirectCount = useRef(0);
  
  // Enhanced auth protection logic using the state machine approach
  useEffect(() => {
    // Prevent excessive redirects
    if (redirectCount.current > 5) {
      console.error("Too many redirects detected. Stopping redirect cycle.");
      return;
    }
    
    // Skip if already at the auth page to prevent loops
    if (location.pathname === '/auth') return;
    
    // Skip if already redirecting
    if (isRedirecting.current) return;
    
    // Add cooldown between redirect attempts
    const now = Date.now();
    if (now - lastAttempt.current < 3000) return;
    
    // Handle different auth states
    switch (status) {
      case 'LOADING':
        // Do nothing while loading
        console.log("Auth is still loading, waiting...");
        break;
        
      case 'UNAUTHENTICATED':
        // Not authenticated - redirect to auth
        console.log("No authenticated user, redirecting to auth");
        lastAttempt.current = now;
        isRedirecting.current = true;
        redirectCount.current += 1;
        
        // Show toast only once per session
        if (!toastShown.current) {
          toast.error("Please sign in to continue");
          toastShown.current = true;
        }
        
        // Navigate to auth with current location as return URL
        const returnUrl = encodeURIComponent(location.pathname + location.search);
        navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
        
        // Reset redirect flag after a delay
        setTimeout(() => {
          isRedirecting.current = false;
        }, 2000);
        break;
        
      case 'AUTHENTICATED':
        // Reset toast shown flag when authenticated
        toastShown.current = false;
        redirectCount.current = 0;
        break;
        
      case 'ERROR':
        // Handle error state
        console.error("Auth error detected in protected route");
        if (!toastShown.current) {
          toast.error("Authentication error. Please try signing in again.");
          toastShown.current = true;
        }
        
        // Redirect to auth after error
        if (!isRedirecting.current) {
          lastAttempt.current = now;
          isRedirecting.current = true;
          navigate('/auth', { replace: true });
          
          setTimeout(() => {
            isRedirecting.current = false;
          }, 2000);
        }
        break;
    }
  }, [status, navigate, location.pathname, location.search]);
  
  // Reset the redirect counter when component unmounts
  useEffect(() => {
    return () => {
      redirectCount.current = 0;
    };
  }, []);
  
  // Loading state
  if (loading || status === 'LOADING') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return status === 'AUTHENTICATED' && user ? <Outlet /> : null;
};

export default ProtectedRoute;
