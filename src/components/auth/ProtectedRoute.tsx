
import React, { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for tracking redirect state
  const isRedirecting = useRef(false);
  const toastShown = useRef(false);
  const lastAttempt = useRef(0);
  
  // Main auth protection logic - simplified to rely on AuthContext
  useEffect(() => {
    // Skip if still loading auth state
    if (loading) return;
    
    // Skip if we're already at the auth page
    if (location.pathname === '/auth') return;
    
    // Skip if already redirecting or recently tried
    if (isRedirecting.current) return;
    if (Date.now() - lastAttempt.current < 3000) return;
    
    // Not authenticated - redirect to auth
    if (!user) {
      lastAttempt.current = Date.now();
      isRedirecting.current = true;
      
      console.log("No authenticated user, redirecting to auth");
      
      // Show toast only once per session
      if (!toastShown.current) {
        toast.error("Please sign in to continue");
        toastShown.current = true;
      }
      
      // Navigate to auth
      navigate('/auth', { replace: true });
      
      // Reset redirect flag after a delay
      setTimeout(() => {
        isRedirecting.current = false;
      }, 1000);
    } else {
      // Reset toast shown flag when authenticated
      toastShown.current = false;
    }
  }, [user, loading, location.pathname, navigate]);
  
  // Loading state
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
