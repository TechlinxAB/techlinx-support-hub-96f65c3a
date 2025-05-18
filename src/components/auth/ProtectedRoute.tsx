
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, profile, loading, isImpersonating, originalProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  // Handle authentication redirects
  useEffect(() => {
    // Only check auth state after loading is complete
    if (loading) return;
    
    // Auth page doesn't need redirection
    if (location.pathname === '/auth') return;
    
    // If there's no user and we haven't attempted redirect yet
    if (!user && !redirectAttempted) {
      console.log("No authenticated user, redirecting to auth");
      setRedirectAttempted(true);
      toast.error("Please sign in to continue");
      navigate('/auth', { replace: true }); // Use replace to prevent history stacking
    }
    
    // Reset redirect flag when user is available
    if (user) {
      setRedirectAttempted(false);
    }
  }, [user, loading, navigate, location.pathname, redirectAttempted]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    // Only check role requirements if we have both user and profile data
    if (!loading && user && profile) {
      // For impersonation, check the original role for protected routes
      const effectiveRole = isImpersonating && originalProfile ? originalProfile.role : profile.role;
      
      if (requiresConsultantRole && effectiveRole !== 'consultant') {
        console.log("User is not a consultant but trying to access restricted route:", location.pathname);
        toast.error("You don't have permission to access this page");
        navigate('/');
      }
    }
  }, [user, profile, originalProfile, isImpersonating, loading, location.pathname, navigate]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only render the outlet if we have a user or if we're on the auth page
  return location.pathname === '/auth' || user ? <Outlet /> : null;
};

export default ProtectedRoute;
