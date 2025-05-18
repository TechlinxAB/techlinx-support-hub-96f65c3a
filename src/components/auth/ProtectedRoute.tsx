
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
    // Skip auth check if we're already on the auth page
    if (location.pathname === '/auth') {
      console.log("Already on auth page, skipping redirect check");
      return;
    }
    
    // Wait until auth state is fully loaded
    if (loading) {
      console.log("Auth state is still loading...");
      return;
    }
    
    console.log("Auth state loaded, user:", !!user, "profile:", !!profile);
    
    // If there's no user and we haven't attempted redirect yet
    if (!user && !redirectAttempted) {
      console.log("No authenticated user, redirecting to auth");
      setRedirectAttempted(true);
      
      // Store current path for redirect after login
      const currentPath = location.pathname !== '/' ? location.pathname : '';
      navigate('/auth', { replace: true, state: { from: currentPath || '/' } });
    } else if (user) {
      // Reset the redirect flag when user is available
      if (redirectAttempted) {
        setRedirectAttempted(false);
      }
    }
  }, [user, loading, navigate, location.pathname, redirectAttempted]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    // Only check role requirements if we have both user and profile data
    // Skip when still loading or missing user/profile
    if (loading || !user || !profile) {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole) {
      // For impersonation, check the original role for protected routes
      const effectiveRole = isImpersonating && originalProfile ? originalProfile.role : profile.role;
      
      if (effectiveRole !== 'consultant') {
        console.log("User is not a consultant but trying to access restricted route:", location.pathname);
        toast.error("You don't have permission to access this page");
        navigate('/', { replace: true });
      }
    }
  }, [user, profile, originalProfile, isImpersonating, loading, location.pathname, navigate]);
  
  // Enhanced loading state with timeout to prevent infinite loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading authentication state...</p>
      </div>
    );
  }
  
  // Allow access to auth page without authentication
  // For all other routes, only render when authenticated
  return location.pathname === '/auth' || user ? <Outlet /> : null;
};

export default ProtectedRoute;
