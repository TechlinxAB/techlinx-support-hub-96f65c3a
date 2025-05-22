
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      // Store the current path to redirect back after login
      // Use React Router navigate to avoid page reloads
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        {/* Spinner removed, only white background */}
      </div>
    );
  }
  
  // If not loading and we have a user, return the children
  if (!loading && user) {
    return <>{children}</>;
  }
  
  // Return null while the useEffect navigates to login
  return null;
};

export default ProtectedRoute;
