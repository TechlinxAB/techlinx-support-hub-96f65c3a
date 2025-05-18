
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

// Simple anti-redirect loop protection
const PROTECTION = {
  LAST_REDIRECT: 0,
  COOLDOWN_MS: 1000,
  TOAST_SHOWN: false
};

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending redirects when unmounting
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Main auth redirection logic - simplified and more robust
  useEffect(() => {
    // Skip if still loading
    if (loading) return;
    
    // Skip if we're already at the auth page
    if (location.pathname === '/auth') return;
    
    // Handle unauthenticated users
    if (!user) {
      const now = Date.now();
      
      // Apply cooldown to prevent redirect loops
      if (now - PROTECTION.LAST_REDIRECT < PROTECTION.COOLDOWN_MS) {
        return;
      }
      
      PROTECTION.LAST_REDIRECT = now;
      console.log("No authenticated user, redirecting to auth");
      
      // Show toast only once
      if (!PROTECTION.TOAST_SHOWN) {
        toast.error("Please sign in to continue");
        PROTECTION.TOAST_SHOWN = true;
      }
      
      // Redirect with a slight delay to allow state to settle
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/auth', { replace: true });
        redirectTimeoutRef.current = null;
      }, 100);
      
      return;
    }
    
    // Reset toast flag when user is authenticated
    PROTECTION.TOAST_SHOWN = false;
    
    // Role-based access protection
    if (profile && user) {
      const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
      
      if (requiresConsultantRole && profile.role !== 'consultant') {
        console.log("Access denied: User is not a consultant");
        toast.error("You don't have permission to access this page");
        
        // Use timeout to avoid immediate redirect conflicts
        redirectTimeoutRef.current = setTimeout(() => {
          navigate('/');
          redirectTimeoutRef.current = null;
        }, 100);
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);
  
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
