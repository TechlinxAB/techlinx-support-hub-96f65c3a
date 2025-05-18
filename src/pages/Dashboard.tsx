
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// Simple state tracking to prevent navigation loops
const DASH_STATE = {
  NAVIGATION_ATTEMPTED: false,
  LAST_NAVIGATION: 0,
  COOLDOWN_MS: 1000
};

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, user } = useAuth();
  const { loadStarredCases } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load starred cases on component mount
  useEffect(() => {
    if (user) {
      loadStarredCases();
    }
    
    // Clean up any pending navigations on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [loadStarredCases, user]);
  
  // Handle redirect targets from URL parameters
  useEffect(() => {
    // Skip if already attempted or no user/profile
    if (DASH_STATE.NAVIGATION_ATTEMPTED || !profile || !user) {
      return;
    }
    
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (!redirectTarget) {
      return;
    }
    
    const now = Date.now();
    
    // Prevent navigation if too recent
    if (now - DASH_STATE.LAST_NAVIGATION < DASH_STATE.COOLDOWN_MS) {
      return;
    }
    
    // Mark navigation as attempted
    DASH_STATE.NAVIGATION_ATTEMPTED = true;
    DASH_STATE.LAST_NAVIGATION = now;
    
    // Use timeout for navigation
    redirectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to redirect to: ${redirectTarget}, user role:`, profile.role);
      
      // Check role before redirecting to restricted areas
      if (redirectTarget.includes('company-dashboard-builder')) {
        if (profile.role !== 'consultant') {
          console.log("Cannot redirect: User is not a consultant");
          toast.error("You don't have permission to access the dashboard builder");
          return;
        }
      }
      
      // Navigate to requested page
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
      redirectTimeoutRef.current = null;
    }, 300);
  }, [location, navigate, profile, user]);
  
  // Show a loading state if no profile is available yet
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // Use profile role as a fallback if currentUser is not available
  const role = currentUser?.role || profile?.role;
  
  return (
    <>
      {role === 'consultant' ? (
        <ConsultantDashboard />
      ) : (
        <UserDashboard />
      )}
    </>
  );
};

export default Dashboard;
