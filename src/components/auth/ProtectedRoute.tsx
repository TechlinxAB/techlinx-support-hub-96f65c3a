
import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Handle unauthenticated state
  React.useEffect(() => {
    if (status === 'UNAUTHENTICATED' && location.pathname !== '/auth') {
      // Include current location as return URL
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
    }
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
