
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const lastRedirectAttempt = useRef(0);
  const redirectTimeoutId = useRef<number | undefined>(undefined);
  
  // Clear any pending redirects when unmounting
  useEffect(() => {
    return () => {
      if (redirectTimeoutId.current !== undefined) {
        window.clearTimeout(redirectTimeoutId.current);
      }
    };
  }, []);
  
  // Handle authentication redirect
  useEffect(() => {
    // Only check authentication after loading is complete
    if (loading) {
      return;
    }

    // If we're already at the auth page, don't redirect
    if (location.pathname === '/auth') {
      return;
    }
    
    // Check if we should redirect to auth
    if (!isRedirecting && !user) {
      const now = Date.now();
      // Prevent multiple redirects within 2 seconds
      if (now - lastRedirectAttempt.current < 2000) {
        return;
      }
      
      lastRedirectAttempt.current = now;
      console.log("No authenticated user, redirecting to auth");
      
      // Set redirecting flag to prevent multiple redirects
      setIsRedirecting(true);
      
      // Show error toast once
      toast.error("Please sign in to continue");
      
      // Redirect to auth page
      navigate('/auth', { replace: true });
    }
    
    // Reset redirecting flag when user is present
    if (user && isRedirecting) {
      setIsRedirecting(false);
    }
  }, [user, loading, navigate, isRedirecting, location.pathname]);
  
  // Check if the path requires a consultant role
  useEffect(() => {
    // Skip if still loading or no user/profile
    if (loading || !user || !profile) {
      return;
    }
    
    const requiresConsultantRole = location.pathname.includes('company-dashboard-builder');
    
    if (requiresConsultantRole && profile.role !== 'consultant') {
      console.log("User is not a consultant but trying to access restricted route:", location.pathname);
      toast.error("You don't have permission to access this page");
      
      // Use timeout to avoid immediate redirect conflicts
      redirectTimeoutId.current = window.setTimeout(() => {
        navigate('/');
      }, 100);
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
