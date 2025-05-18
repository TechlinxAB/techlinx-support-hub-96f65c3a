
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import navigationService from '@/services/navigationService';

const ProtectedRoute = () => {
  const { 
    authState,
    loading, 
    resetAuth 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [authResetAttempted, setAuthResetAttempted] = useState(false);
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const navigationTimerRef = useRef<number | null>(null);
  const isAuthPage = location.pathname === '/auth';
  const stableAuthRef = useRef(authState);
  const delayRef = useRef<number | null>(null);
  const stabilityTimerRef = useRef<number | null>(null);

  // Register the navigate function with the navigation service on mount
  useEffect(() => {
    console.log('ProtectedRoute: Registering navigation service');
    navigationService.setNavigateFunction(navigate);
    
    // Reset navigation tracking when route changes
    return () => {
      setNavigationAttempted(false);
      
      // Clear any pending navigation timers
      if (navigationTimerRef.current !== null) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
      
      if (delayRef.current !== null) {
        clearTimeout(delayRef.current);
        delayRef.current = null;
      }
      
      if (stabilityTimerRef.current !== null) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
    };
  }, [navigate, location.pathname]);
  
  // Track auth state changes with a cooldown to prevent rapid changes
  useEffect(() => {
    // Clear any existing stability timer
    if (stabilityTimerRef.current !== null) {
      clearTimeout(stabilityTimerRef.current);
    }
    
    // Only update our stable auth ref if the state has persisted
    // This prevents flickering between auth states
    stabilityTimerRef.current = window.setTimeout(() => {
      // Don't allow transitions from AUTHENTICATED to UNAUTHENTICATED unless explicitly signed out
      // This prevents the initialization timeout from causing users to be logged out
      if (stableAuthRef.current === 'AUTHENTICATED' && authState === 'UNAUTHENTICATED') {
        console.log('ProtectedRoute: Ignoring transition from AUTHENTICATED to UNAUTHENTICATED');
        return;
      }
      
      console.log(`ProtectedRoute: Updating stable auth state from ${stableAuthRef.current} to ${authState}`);
      stableAuthRef.current = authState;
    }, 1000); // 1 second stability required
    
    return () => {
      if (stabilityTimerRef.current !== null) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
    };
  }, [authState]);
  
  // Handle navigation based on auth state
  useEffect(() => {
    // Skip everything if already on auth page and not authenticated
    if (isAuthPage && authState !== 'AUTHENTICATED' && authState !== 'IMPERSONATING') {
      return;
    }
    
    // Wait until auth state is fully loaded and stable
    if (loading) {
      return;
    }
    
    // Only attempt navigation once per route change to prevent loops
    if (navigationAttempted) {
      return;
    }

    // If authenticated and on auth page, redirect to home
    if ((authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') && isAuthPage) {
      setNavigationAttempted(true);
      console.log('ProtectedRoute: User is authenticated, redirecting to home from auth page');
      
      // Use a short delay to prevent immediate navigation
      delayRef.current = window.setTimeout(() => {
        // Get the redirectTo from state or default to '/'
        const redirectTo = location.state?.from || '/';
        navigationService.navigate(redirectTo, { replace: true });
      }, 100);
      
      return;
    }

    // If there's no user and we're not on the auth page, redirect with debounce
    if (authState === 'UNAUTHENTICATED' && stableAuthRef.current === 'UNAUTHENTICATED' && !isAuthPage) {
      // Store current path for redirect after login
      let currentPath = location.pathname;
      if (currentPath === '/') {
        currentPath = '';
      }
      
      console.log(`ProtectedRoute: Unauthenticated, redirecting to auth page from ${currentPath || '/'}`);
      setNavigationAttempted(true);
      
      // Use a longer timeout to debounce the navigation
      // This prevents navigation jumps if auth state is still settling
      if (navigationTimerRef.current !== null) {
        clearTimeout(navigationTimerRef.current);
      }
      
      navigationTimerRef.current = window.setTimeout(() => {
        // Use navigation service to prevent loops
        if (navigationService.isReady()) {
          navigationService.navigate('/auth', { 
            replace: true, 
            state: { from: currentPath || '/' } 
          });
          navigationTimerRef.current = null;
        }
      }, 800);
    }
  }, [authState, loading, isAuthPage, location.pathname, navigationAttempted, location.state]);
  
  // Function to handle auth reset if user is stuck
  const handleResetAuth = async () => {
    setAuthResetAttempted(true);
    
    try {
      await resetAuth();
      
      // Redirect to auth page via hard redirect
      navigationService.hardRedirect('/auth?reset=complete');
    } catch (error) {
      console.error("Critical error during auth reset:", error);
      toast.error("Failed to reset auth state. Please try refreshing your browser.");
      
      // Last resort: direct refresh
      window.location.href = '/auth';
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
  // For all other routes, only render when authenticated or impersonating
  return isAuthPage || (authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') ? <Outlet /> : null;
};

export default ProtectedRoute;
