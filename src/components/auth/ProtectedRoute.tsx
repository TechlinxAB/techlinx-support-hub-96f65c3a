
import React, { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

// Simple static state to prevent multiple redirects
const REDIRECT_STATE = {
  redirecting: false,
  lastRedirectTime: 0,
  redirectCooldown: 5000, // Much longer cooldown to prevent any chance of loops
  toastShown: false
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Main auth protection logic
  useEffect(() => {
    // Skip if still loading auth state
    if (loading) return;
    
    // Skip if we're already at the auth page
    if (location.pathname === '/auth') return;
    
    // Skip if already redirecting
    if (REDIRECT_STATE.redirecting) return;
    
    // Not authenticated - redirect to auth
    if (!user) {
      // Apply long cooldown to prevent rapid redirects
      const now = Date.now();
      if (now - REDIRECT_STATE.lastRedirectTime < REDIRECT_STATE.redirectCooldown) return;
      
      REDIRECT_STATE.lastRedirectTime = now;
      REDIRECT_STATE.redirecting = true;
      
      console.log("No authenticated user, redirecting to auth");
      
      // Show toast only once 
      if (!REDIRECT_STATE.toastShown) {
        toast.error("Please sign in to continue");
        REDIRECT_STATE.toastShown = true;
      }
      
      // Navigate to auth
      navigate('/auth', { replace: true });
      
      // Reset redirect flag after a delay
      setTimeout(() => {
        REDIRECT_STATE.redirecting = false;
      }, 1000);
    } else {
      // Reset toast shown flag when authenticated
      REDIRECT_STATE.toastShown = false;
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
