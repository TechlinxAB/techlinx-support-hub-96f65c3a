
import React, { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { forceSignOut } from '@/integrations/supabase/client';
import navigationService from '@/services/navigationService';

const ProtectedRoute = () => {
  const { 
    user, 
    profile, 
    loading, 
    authState,
    isImpersonating, 
    originalProfile, 
    resetAuth 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authResetAttempted, setAuthResetAttempted] = React.useState(false);

  // Register the navigate function with the navigation service on mount
  useEffect(() => {
    navigationService.setNavigateFunction(navigate);
  }, [navigate]);
  
  // Special handle for the auth page
  const isAuthPage = location.pathname === '/auth';
  
  // Handle authentication redirects
  useEffect(() => {
    // Skip everything if already on auth page
    if (isAuthPage) {
      return;
    }
    
    // Wait until auth state is fully loaded
    if (loading) {
      return;
    }

    // If there's no user and we're not on the auth page, redirect
    if (authState === 'UNAUTHENTICATED') {
      // Store current path for redirect after login
      let currentPath = location.pathname;
      if (currentPath === '/') {
        currentPath = '';
      }
      
      // Use navigation service to prevent loops
      navigationService.navigate('/auth', { 
        replace: true, 
        state: { from: currentPath || '/' } 
      });
    }
  }, [authState, loading, navigate, location.pathname, isAuthPage]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    // Only check role requirements if we have both user and profile data
    if (loading || !user || !profile || authState !== 'AUTHENTICATED') {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole) {
      // For impersonation, check the original role for protected routes
      const effectiveRole = isImpersonating && originalProfile ? originalProfile.role : profile.role;
      
      if (effectiveRole !== 'consultant') {
        toast.error("You don't have permission to access this page");
        navigationService.navigate('/', { replace: true });
      }
    }
  }, [user, profile, originalProfile, isImpersonating, loading, location.pathname, authState]);
  
  // Function to handle auth reset if user is stuck
  const handleResetAuth = async () => {
    setAuthResetAttempted(true);
    
    try {
      // Try the forced signout first
      await forceSignOut();
      
      // Then do the full reset
      await resetAuth();
      
      // Redirect to auth page via navigation service
      navigationService.hardRedirect('/auth');
    } catch (error) {
      console.error("Critical error during auth reset:", error);
      toast.error("Failed to reset auth state. Please try refreshing your browser.");
      
      // Last resort: direct refresh
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    }
  };
  
  // Enhanced loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading authentication state...</p>
      </div>
    );
  }
  
  // Show recovery option if auth is in error state
  if (authState === 'ERROR' && !authResetAttempted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md p-6 space-y-4 bg-white shadow-md rounded-md">
          <h2 className="text-xl font-semibold text-red-600">Authentication Issue</h2>
          <p className="text-gray-600">
            We encountered an issue with your authentication state. This might be due to an expired session or data inconsistency.
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
  return isAuthPage || (authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') ? <Outlet /> : null;
};

export default ProtectedRoute;
