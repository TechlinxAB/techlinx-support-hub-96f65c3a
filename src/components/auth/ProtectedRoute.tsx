
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Effect for handling redirects based on auth status
  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    
    // Only redirect if status is definitively UNAUTHENTICATED (not during LOADING)
    // and not already at auth page and not already tried redirecting
    if (status === 'UNAUTHENTICATED' && 
        location.pathname !== '/auth' && 
        !redirectAttempted.current) {
      
      console.log("Not authenticated, redirecting to login");
      redirectAttempted.current = true;
      
      // Add a small delay to allow any pending auth operations to complete
      redirectTimeoutRef.current = setTimeout(() => {
        // Double-check status hasn't changed during the delay
        if (status === 'UNAUTHENTICATED') {
          // Include current location as return URL
          const returnUrl = encodeURIComponent(location.pathname + location.search);
          navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
        }
      }, 100);
    }
    
    // Reset redirect flag if auth status changes to AUTHENTICATED
    if (status === 'AUTHENTICATED') {
      redirectAttempted.current = false;
    }
    
    // Cleanup timeout
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [status, navigate, location.pathname, location.search]);
  
  // Show loading state
  if (status === 'LOADING') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only render children when authenticated
  return status === 'AUTHENTICATED' ? <Outlet /> : null;
};

export default ProtectedRoute;
