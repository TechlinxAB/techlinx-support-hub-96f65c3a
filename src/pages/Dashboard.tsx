
import React, { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// State tracking to prevent navigation loops
const DASH_STATE = {
  NAVIGATION_ATTEMPTED: false,
  LAST_NAVIGATION: 0,
  COOLDOWN_MS: 2000,
  NAVIGATION_IN_PROGRESS: false
};

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, user } = useAuth();
  const { loadStarredCases } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load starred cases on component mount when authenticated
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
    // Skip if no user/profile
    if (!profile || !user) return;
    
    // Skip if navigation is in progress or already attempted
    if (DASH_STATE.NAVIGATION_IN_PROGRESS || DASH_STATE.NAVIGATION_ATTEMPTED) return;
    
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (!redirectTarget) return;
    
    // Apply cooldown to prevent navigation loops
    const now = Date.now();
    if (now - DASH_STATE.LAST_NAVIGATION < DASH_STATE.COOLDOWN_MS) return;
    
    // Mark navigation in progress
    DASH_STATE.LAST_NAVIGATION = now;
    DASH_STATE.NAVIGATION_ATTEMPTED = true;
    DASH_STATE.NAVIGATION_IN_PROGRESS = true;
    
    // Navigate with delay
    redirectTimeoutRef.current = setTimeout(() => {
      console.log(`Redirecting to: ${redirectTarget}, user role:`, profile.role);
      
      // Check role before redirecting to restricted areas
      if (redirectTarget.includes('company-dashboard-builder') && profile.role !== 'consultant') {
        toast.error("You don't have permission to access the dashboard builder");
        DASH_STATE.NAVIGATION_IN_PROGRESS = false;
        return;
      }
      
      // Navigate to requested page
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
      
      // Reset navigation in progress after a delay
      setTimeout(() => {
        DASH_STATE.NAVIGATION_IN_PROGRESS = false;
      }, 500);
      
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
