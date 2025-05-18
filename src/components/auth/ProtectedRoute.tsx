
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { forceSignOut } from '@/integrations/supabase/client'; 

const ProtectedRoute = () => {
  const { user, profile, loading, isImpersonating, originalProfile, resetAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [authResetAttempted, setAuthResetAttempted] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [navigationCount, setNavigationCount] = useState(0);
  const [lastNavigationTime, setLastNavigationTime] = useState(0);
  
  // Set a loading timeout to prevent infinite loading states
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [loading]);

  // Handle navigation loops - detect if we're looping too much
  useEffect(() => {
    // Reset the counter if we stay on the same route for a bit
    const resetCountTimer = setTimeout(() => {
      if (navigationCount > 0) {
        setNavigationCount(0);
      }
    }, 5000);

    return () => clearTimeout(resetCountTimer);
  }, [navigationCount]);
  
  // Special handle for the auth page
  const isAuthPage = location.pathname === '/auth';
  
  // Handle authentication redirects with loop detection
  useEffect(() => {
    // Skip everything if already on auth page to prevent loop
    if (isAuthPage) {
      console.log("Already on auth page, skipping redirect logic");
      return;
    }
    
    // Wait until auth state is fully loaded
    if (loading && !loadingTimeout) {
      console.log("Auth state is still loading...");
      return;
    }

    // Check if time since last navigation is too quick (potential loop)
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationTime;
    
    // If navigating too frequently, we might be in a loop
    if (timeSinceLastNav < 500 && navigationCount > 3) {
      console.error("Too many navigation attempts detected. Possible redirect loop.");
      toast.error("Navigation loop detected", {
        description: "Breaking the loop and redirecting to auth page"
      });
      
      // Force sign out and reset auth state when a loop is detected
      forceSignOut().then(() => {
        // Clear navigation count
        setNavigationCount(0);
        setRedirectAttempted(false);
        
        // Hard redirect to break any React Router loops
        window.location.href = '/auth';
      });
      
      return;
    }
    
    // Update last navigation time
    setLastNavigationTime(now);
    
    // If we've redirected too many times, something is wrong
    if (navigationCount > 5) {
      console.error("Too many navigation attempts detected. Possible redirect loop.");
      toast.error("Navigation loop detected", {
        description: "Attempting to recover by resetting authentication state"
      });
      
      // Force sign out and reset auth state
      forceSignOut().then(() => {
        // Hard redirect to break loops
        window.location.href = '/auth';
      });
      
      return;
    }
    
    console.log("Auth state loaded, user:", !!user, "profile:", !!profile);
    
    // If there's no user and we haven't attempted redirect yet
    if (!user && !redirectAttempted) {
      console.log("No authenticated user, redirecting to auth");
      setRedirectAttempted(true);
      
      // Increment navigation count to detect potential loops
      setNavigationCount(prev => prev + 1);
      
      // Store current path for redirect after login
      let currentPath = location.pathname;
      if (currentPath === '/') {
        currentPath = '';
      }
      
      // Use the navigate function for the redirect
      navigate('/auth', { replace: true, state: { from: currentPath || '/' } });
    } else if (user && profile) {
      // Reset the redirect flag when user is available
      if (redirectAttempted) {
        setRedirectAttempted(false);
      }
    }
  }, [user, profile, loading, loadingTimeout, navigate, location.pathname, redirectAttempted, navigationCount, lastNavigationTime, isAuthPage]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    // Only check role requirements if we have both user and profile data
    if (loading || !user || !profile) {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole) {
      // For impersonation, check the original role for protected routes
      const effectiveRole = isImpersonating && originalProfile ? originalProfile.role : profile.role;
      
      if (effectiveRole !== 'consultant') {
        console.log("User is not a consultant but trying to access restricted route:", location.pathname);
        toast.error("You don't have permission to access this page");
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, originalProfile, isImpersonating, loading, location.pathname, navigate]);
  
  // Function to handle auth reset if user is stuck
  const handleResetAuth = async () => {
    setAuthResetAttempted(true);
    
    try {
      // Try the forced signout first as it's more reliable
      await forceSignOut();
      
      // Then do the full reset
      await resetAuth();
      
      // Finally redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error("Critical error during auth reset:", error);
      toast.error("Failed to reset auth state. Please try refreshing your browser.");
      
      // Last resort: direct the user to refresh
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);
    }
  };
  
  // Enhanced loading state with timeout to prevent infinite loading
  if (loading && !loadingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading authentication state...</p>
      </div>
    );
  }
  
  // Show recovery option if loading is taking too long
  if (loadingTimeout && !authResetAttempted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md p-6 space-y-4 bg-white shadow-md rounded-md">
          <h2 className="text-xl font-semibold text-red-600">Authentication Issue</h2>
          <p className="text-gray-600">
            Authentication is taking longer than expected. You might be experiencing an issue with your auth session.
          </p>
          <Button 
            onClick={handleResetAuth} 
            variant="destructive"
            className="w-full"
          >
            Reset Authentication State
          </Button>
          <p className="text-xs text-gray-500">
            This will log you out and reset your authentication state. You'll need to log in again.
          </p>
        </div>
      </div>
    );
  }
  
  // Allow access to auth page without authentication
  // For all other routes, only render when authenticated
  return isAuthPage || user ? <Outlet /> : null;
};

export default ProtectedRoute;
