
import React, { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Handle unauthenticated state with debounce to prevent redirect loops
  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout | null = null;
    
    if (status === 'UNAUTHENTICATED' && location.pathname !== '/auth') {
      // Use timeout to prevent rapid redirects in case of auth state flapping
      redirectTimeout = setTimeout(() => {
        console.log("Not authenticated, redirecting to login");
        // Include current location as return URL
        const returnUrl = encodeURIComponent(location.pathname + location.search);
        navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
      }, 100);
    }
    
    return () => {
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
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
