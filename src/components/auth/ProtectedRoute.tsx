
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);
  const toastShown = useRef(false);
  
  // Effect for handling redirects based on auth status
  useEffect(() => {
    // Only redirect if status is definitively UNAUTHENTICATED (not during LOADING)
    // and not already at auth page and not already tried redirecting
    if (status === 'UNAUTHENTICATED' && 
        location.pathname !== '/auth' && 
        !redirectAttempted.current) {
      
      console.log("Not authenticated, redirecting to login");
      redirectAttempted.current = true;
      
      // Include current location as return URL
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
      
      // Show toast notification (only once)
      if (!toastShown.current) {
        toast.error("Please sign in to continue");
        toastShown.current = true;
      }
    }
    
    // Reset redirect flag if user navigates to auth page directly
    // This allows future redirects to work if needed
    if (location.pathname === '/auth') {
      redirectAttempted.current = false;
    }
  }, [status, navigate, location.pathname, location.search]);
  
  // Reset the redirect flag when auth status changes to AUTHENTICATED
  // This ensures proper handling if the user signs out later
  useEffect(() => {
    if (status === 'AUTHENTICATED') {
      redirectAttempted.current = false;
      toastShown.current = false;
    }
  }, [status]);
  
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
