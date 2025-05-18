
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

// Simplified anti-redirect protection
const REDIRECT_STATE = {
  LAST_REDIRECT: 0,
  COOLDOWN_MS: 2000, // Increased to prevent rapid redirects
  TOAST_SHOWN: false,
  REDIRECT_IN_PROGRESS: false
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastShownRef = useRef(false);

  // Clear any pending redirects when unmounting
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Main auth protection logic - simplified
  useEffect(() => {
    // Skip if still loading
    if (loading) return;
    
    // We're already at the auth page, no need to redirect
    if (location.pathname === '/auth') return;
    
    // Not authenticated - redirect to auth
    if (!user) {
      // Skip if we're in redirect cooldown period
      const now = Date.now();
      if (now - REDIRECT_STATE.LAST_REDIRECT < REDIRECT_STATE.COOLDOWN_MS || 
          REDIRECT_STATE.REDIRECT_IN_PROGRESS) {
        return;
      }
      
      // Mark that we're starting a redirect
      REDIRECT_STATE.LAST_REDIRECT = now;
      REDIRECT_STATE.REDIRECT_IN_PROGRESS = true;
      
      console.log("No authenticated user, redirecting to auth");
      
      // Show toast only once per session
      if (!toastShownRef.current) {
        toast.error("Please sign in to continue");
        toastShownRef.current = true;
      }
      
      // Use timeout to allow state to settle
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/auth', { replace: true });
        
        // Reset redirect in progress after a delay
        setTimeout(() => {
          REDIRECT_STATE.REDIRECT_IN_PROGRESS = false;
        }, 500);
        
        redirectTimeoutRef.current = null;
      }, 100);
    } else {
      // User is authenticated, reset toast shown flag
      toastShownRef.current = false;
    }
  }, [user, loading, location.pathname, navigate]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return user ? <Outlet /> : null;
};

export default ProtectedRoute;
