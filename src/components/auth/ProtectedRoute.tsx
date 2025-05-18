
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
  const [navigationTimestamps, setNavigationTimestamps] = useState<number[]>([]);
  const [lastNavigationTime, setLastNavigationTime] = useState(0);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [isJustLoggedIn, setIsJustLoggedIn] = useState(false);
  
  // Set a loading timeout to prevent infinite loading states
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 seconds timeout
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [loading]);

  // Handle navigation loops - with better tracking of time between redirects
  useEffect(() => {
    // Reset the counter after a longer period without redirects
    const resetCountTimer = setTimeout(() => {
      if (navigationCount > 0) {
        setNavigationCount(0);
        setNavigationTimestamps([]);
      }
    }, 10000); // 10 seconds with no redirects resets the counter

    return () => clearTimeout(resetCountTimer);
  }, [navigationCount]);
  
  // Special handle for the auth page
  const isAuthPage = location.pathname === '/auth';
  
  // Profile timing check - after user becomes available but profile doesn't come through
  useEffect(() => {
    // Only start this check when we have a user but no profile
    if (user && !profile && !loading && !profileNotFound) {
      const profileTimer = setTimeout(() => {
        setProfileNotFound(true);
      }, 5000); // 5 seconds timeout - increased from 3 seconds
      
      return () => clearTimeout(profileTimer);
    }
    
    // If profile is found, reset the flag
    if (profile) {
      setProfileNotFound(false);
    }
    
    return undefined;
  }, [user, profile, loading, profileNotFound]);
  
  // Track when user is freshly logged in to avoid immediate redirects
  useEffect(() => {
    if (user && !isJustLoggedIn) {
      setIsJustLoggedIn(true);
      // Reset after a bit
      const timer = setTimeout(() => {
        setIsJustLoggedIn(false);
      }, 3000); // Increased from 2 seconds
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [user, isJustLoggedIn]);
  
  // Handle authentication redirects with more resilient loop detection
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
    
    // Add more sophisticated redirect loop detection
    // We'll use a rolling window of timestamps to detect rapid redirects
    if (navigationTimestamps.length >= 3) {
      // Check if we have 3 redirects within 1.5 seconds (potential loop)
      const timeWindow = now - navigationTimestamps[navigationTimestamps.length - 3];
      if (timeWindow < 1500) {
        console.error("Potential redirect loop detected: 3 redirects in", timeWindow, "ms");
        
        // Only break the loop if it's happening very rapidly
        if (timeWindow < 800) {
          console.error("Critical redirect loop detected! Breaking the cycle.");
          toast.error("Navigation issue detected", {
            description: "Resolving authentication state issues..."
          });
          
          // Force sign out and reset auth state when a loop is detected
          forceSignOut().then(() => {
            // Clear navigation count
            setNavigationCount(0);
            setNavigationTimestamps([]);
            setRedirectAttempted(false);
            
            // Hard redirect to break any React Router loops
            // We'll use a slight delay to ensure state is reset
            setTimeout(() => {
              window.location.href = '/auth?reset=true';
            }, 200);
          });
          
          return;
        }
      }
    }
    
    // Update last navigation time
    setLastNavigationTime(now);
    
    // If we've redirected too many times, something is wrong
    if (navigationCount > 10) { // Increased from 5
      console.error("Too many navigation attempts detected. Possible redirect loop.");
      toast.error("Navigation issue detected", {
        description: "Attempting to recover by resetting authentication state"
      });
      
      // Force sign out and reset auth state
      forceSignOut().then(() => {
        // Hard redirect to break loops
        window.location.href = '/auth?reset=true';
      });
      
      return;
    }
    
    console.log("Auth state loaded, user:", !!user, "profile:", !!profile);
    
    // Special case: if we have user but can't get profile after a timeout
    if (user && !profile && profileNotFound && !isJustLoggedIn) {
      console.log("Profile could not be loaded, redirecting to auth for clean session");
      toast.error("Authentication issue", {
        description: "Could not load your user profile. Please sign in again."
      });
      forceSignOut().then(() => {
        window.location.href = '/auth?profile=missing';
      });
      return;
    }
    
    // If there's no user and we haven't attempted redirect yet
    if (!user && !redirectAttempted) {
      console.log("No authenticated user, redirecting to auth");
      setRedirectAttempted(true);
      
      // Increment navigation count
      setNavigationCount(prev => prev + 1);
      
      // Track timestamp of this redirect
      setNavigationTimestamps(prev => [...prev, now]);
      
      // Store current path for redirect after login
      let currentPath = location.pathname;
      if (currentPath === '/') {
        currentPath = '';
      }
      
      // Try to use navigate for better UX but fallback to hard redirect if needed
      try {
        navigate('/auth', { 
          replace: true, 
          state: { from: currentPath || '/' } 
        });
      } catch (error) {
        console.error("Navigation error:", error);
        // Fallback to direct redirect
        window.location.href = '/auth';
      }
    } else if (user && profile) {
      // Reset the redirect flag when user is available
      if (redirectAttempted) {
        setRedirectAttempted(false);
      }
    }
  }, [
    user, 
    profile, 
    loading, 
    loadingTimeout, 
    navigate, 
    location.pathname, 
    redirectAttempted, 
    navigationCount,
    navigationTimestamps,
    lastNavigationTime, 
    isAuthPage, 
    profileNotFound, 
    isJustLoggedIn
  ]);
  
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
  if ((loadingTimeout && !authResetAttempted) || (user && !profile && profileNotFound)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md p-6 space-y-4 bg-white shadow-md rounded-md">
          <h2 className="text-xl font-semibold text-red-600">Authentication Issue</h2>
          <p className="text-gray-600">
            {user && !profile && profileNotFound 
              ? "Your user profile could not be loaded. This might indicate a data issue."
              : "Authentication is taking longer than expected. You might be experiencing an issue with your auth session."}
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
