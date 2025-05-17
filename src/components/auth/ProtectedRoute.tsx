
import React, { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect if we're done loading and there's no user
    if (!loading && !user) {
      console.log("No authenticated user, redirecting to auth");
      toast.error("Please sign in to continue");
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
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
