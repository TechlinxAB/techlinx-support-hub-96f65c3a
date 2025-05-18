
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, profile, loading, isImpersonating, originalProfile, resetAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [authResetAttempted, setAuthResetAttempted] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
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
  
  // Handle authentication redirects
  useEffect(() => {
    // Skip auth check if we're already on the auth page
    if (location.pathname === '/auth') {
      console.log("Already on auth page, skipping redirect check");
      return;
    }
    
    // Wait until auth state is fully loaded
    if (loading && !loadingTimeout) {
      console.log("Auth state is still loading...");
      return;
    }
    
    console.log("Auth state loaded, user:", !!user, "profile:", !!profile);
    
    // If there's no user and we haven't attempted redirect yet
    if (!user && !redirectAttempted) {
      console.log("No authenticated user, redirecting to auth");
      setRedirectAttempted(true);
      
      // Store current path for redirect after login
      const currentPath = location.pathname !== '/' ? location.pathname : '';
      navigate('/auth', { replace: true, state: { from: currentPath || '/' } });
    } else if (user) {
      // Reset the redirect flag when user is available
      if (redirectAttempted) {
        setRedirectAttempted(false);
      }
    }
  }, [user, profile, loading, loadingTimeout, navigate, location.pathname, redirectAttempted]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    // Only check role requirements if we have both user and profile data
    // Skip when still loading or missing user/profile
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
    await resetAuth();
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
  return location.pathname === '/auth' || user ? <Outlet /> : null;
};

export default ProtectedRoute;
