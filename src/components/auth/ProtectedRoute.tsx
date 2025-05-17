
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';
import { hasValidSession } from '@/integrations/supabase/client';

// Global redirect state to prevent loops
const REDIRECT_STATE = {
  LAST_AUTH_REDIRECT: 0,
  LAST_HOME_REDIRECT: 0,
  REDIRECT_COOLDOWN_MS: 2000,
};

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const toastShownRef = useRef(false);
  const redirectTimeoutRef = useRef<number | null>(null);

  // Clear any pending redirects when unmounting
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Initial session validation
  useEffect(() => {
    const validateSession = async () => {
      // Skip if we're already at auth page
      if (location.pathname === '/auth') {
        setInitialCheckDone(true);
        return;
      }

      setIsCheckingSession(true);
      try {
        const isValid = await hasValidSession();
        if (!isValid && !loading) {
          console.log("No valid session found during initial check");
          if (!toastShownRef.current) {
            toast.error("Please sign in to continue");
            toastShownRef.current = true;
          }
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error("Error validating session:", error);
      } finally {
        setIsCheckingSession(false);
        setInitialCheckDone(true);
      }
    };

    if (!initialCheckDone && !loading) {
      validateSession();
    }
  }, [loading, navigate, location.pathname, initialCheckDone]);

  // Main auth redirection logic - only runs after initial check is done
  useEffect(() => {
    // Skip if still loading or initial check isn't done
    if (loading || !initialCheckDone) {
      return;
    }
    
    // If we're already at the auth page, don't redirect
    if (location.pathname === '/auth') {
      return;
    }
    
    const now = Date.now();
    
    // Check if we need to redirect to auth
    if (!user) {
      // Don't redirect if we've redirected recently (anti-loop)
      if (now - REDIRECT_STATE.LAST_AUTH_REDIRECT < REDIRECT_STATE.REDIRECT_COOLDOWN_MS) {
        return;
      }
      
      REDIRECT_STATE.LAST_AUTH_REDIRECT = now;
      console.log("No authenticated user, redirecting to auth");
      
      // Only show toast once
      if (!toastShownRef.current) {
        toast.error("Please sign in to continue");
        toastShownRef.current = true;
      }
      
      // Use timeout to prevent immediate execution
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/auth', { replace: true });
        redirectTimeoutRef.current = null;
      }, 100);
    } else {
      // Reset toast flag when user is authenticated
      toastShownRef.current = false;
    }
  }, [user, loading, navigate, location.pathname, initialCheckDone]);
  
  // Role-based access protection
  useEffect(() => {
    // Skip if still loading or no user/profile
    if (loading || !user || !profile || !initialCheckDone) {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole && profile.role !== 'consultant') {
      console.log("Access denied: User is not a consultant");
      toast.error("You don't have permission to access this page");
      
      // Use timeout to avoid immediate redirect conflicts
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate('/');
        redirectTimeoutRef.current = null;
      }, 100);
    }
  }, [user, profile, loading, location.pathname, navigate, initialCheckDone]);
  
  if (loading || isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return user ? <Outlet /> : null;
};

export default ProtectedRoute;
