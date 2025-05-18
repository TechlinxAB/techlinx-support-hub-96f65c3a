
import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { status, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Simple effect to handle redirects based on auth status
  React.useEffect(() => {
    // Wait for initial loading to complete
    if (loading || status === 'LOADING') {
      return;
    }
    
    // If not authenticated and not already at auth page, redirect to auth
    if (status === 'UNAUTHENTICATED' && location.pathname !== '/auth') {
      console.log("No authenticated user, redirecting to auth");
      
      // Include current location as return URL
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
      
      // Show toast only if we're not already at the auth page
      if (location.pathname !== '/auth') {
        toast.error("Please sign in to continue");
      }
    }
  }, [status, loading, navigate, location.pathname, location.search]);
  
  // Show loading state
  if (loading || status === 'LOADING') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only render the routes when authenticated
  return status === 'AUTHENTICATED' ? <Outlet /> : null;
};

export default ProtectedRoute;
