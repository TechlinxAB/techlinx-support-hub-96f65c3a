
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Handle authentication redirect
  useEffect(() => {
    // Only redirect if:
    // 1. We're not already redirecting (prevents multiple redirects)
    // 2. We're done loading
    // 3. There's no user
    if (!isRedirecting && !loading && !user) {
      console.log("No authenticated user, redirecting to auth");
      // Set redirecting flag to prevent multiple redirects
      setIsRedirecting(true);
      // Show error toast
      toast.error("Please sign in to continue");
      // Redirect to auth page
      navigate('/auth', { replace: true });
    }
    
    // Reset redirecting flag when user is present
    if (user) {
      setIsRedirecting(false);
    }
  }, [user, loading, navigate, isRedirecting]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    // Only check role requirements if we have both user and profile data
    if (!loading && user && profile && requiresConsultantRole && profile.role !== 'consultant') {
      console.log("User is not a consultant but trying to access restricted route:", location.pathname);
      toast.error("You don't have permission to access this page");
      navigate('/');
    }
  }, [user, profile, loading, location.pathname, navigate]);
  
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
