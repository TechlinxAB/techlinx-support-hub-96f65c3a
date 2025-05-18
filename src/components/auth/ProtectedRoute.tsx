
import React, { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, clearAuthData } from '@/integrations/supabase/client';

const ProtectedRoute = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Function to verify token validity on protected routes
  useEffect(() => {
    const verifySession = async () => {
      // Skip verification if already known to be unauthenticated
      if (status === 'UNAUTHENTICATED') return;
      
      try {
        // Check if the session exists server-side
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          console.log("No valid session found, clearing local auth data");
          await clearAuthData();
          
          // Only redirect if not already at auth
          if (location.pathname !== '/auth') {
            const returnUrl = encodeURIComponent(location.pathname + location.search);
            navigate(`/auth?returnUrl=${returnUrl}`, { replace: true });
            toast.error("Your session has expired. Please sign in again.");
          }
        }
      } catch (err) {
        console.error("Session verification error:", err);
      }
    };
    
    // Only verify on protected routes when auth status is uncertain
    if (status === 'LOADING' && location.pathname !== '/auth') {
      verifySession();
    }
  }, [status, navigate, location.pathname, location.search]);
  
  // Effect to handle redirects based on auth status
  useEffect(() => {
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
  }, [status, navigate, location.pathname, location.search]);
  
  // Show loading state
  if (status === 'LOADING') {
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
