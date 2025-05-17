
import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, user } = useAuth();
  const { loadStarredCases } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const redirectTimeoutRef = useRef<number | null>(null);
  
  // Load starred cases on component mount
  useEffect(() => {
    if (user) {
      loadStarredCases();
    }
    
    // Clean up any pending navigations on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [loadStarredCases, user]);
  
  // Enhanced navigation handling with improved direct access for dashboard builder
  useEffect(() => {
    // Skip if we've already attempted navigation or no user/profile
    if (navigationAttempted || !profile || !user) {
      return;
    }
    
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (!redirectTarget) {
      return;
    }
    
    // Mark that we've attempted navigation to prevent loops
    setNavigationAttempted(true);
    
    // Use timeout for navigation to ensure separation from auth logic
    redirectTimeoutRef.current = window.setTimeout(() => {
      console.log(`Attempting to redirect to: ${redirectTarget}, user role:`, profile?.role);
      
      // Check role before redirecting to restricted areas
      if (redirectTarget.includes('company-dashboard-builder')) {
        if (profile?.role !== 'consultant') {
          console.log("Cannot redirect: User is not a consultant");
          toast.error("You don't have permission to access the dashboard builder");
          return;
        }
      }
      
      // Navigate to the requested page
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
      redirectTimeoutRef.current = null;
    }, 300);
    
  }, [location, navigate, navigationAttempted, profile, user]);
  
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
