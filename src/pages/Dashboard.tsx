
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, isImpersonating } = useAuth();
  const { loadStarredCases } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationAttemptedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Load starred cases safely with error handling
  const safelyLoadStarredCases = useCallback(() => {
    try {
      loadStarredCases();
    } catch (error) {
      console.error("Error loading starred cases:", error);
      // Don't set error state for this non-critical feature
    }
  }, [loadStarredCases]);
  
  // Wait for profile to be ready
  useEffect(() => {
    if (profile) {
      // Check for valid profile
      if (!profile.id || !profile.role) {
        console.error("Dashboard: Invalid profile data", profile);
        setHasError(true);
      } else {
        setIsReady(true);
        // Load starred cases once profile is available
        safelyLoadStarredCases();
      }
    }
  }, [profile, safelyLoadStarredCases]);
  
  // Enhanced navigation handling with improved direct access for dashboard builder
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (redirectTarget && !navigationAttemptedRef.current && profile) {
      // Mark that we've attempted navigation to prevent loops
      navigationAttemptedRef.current = true;
      
      console.log(`Dashboard: Attempting to redirect to: ${redirectTarget}, user role:`, profile?.role);
      
      try {
        // For dashboard builder pages, verify role before redirecting
        if (redirectTarget.includes('company-dashboard-builder')) {
          if (profile?.role === 'consultant') {
            toast.info("Loading dashboard builder...");
            navigate(redirectTarget);
            return;
          } else {
            console.log("Dashboard: Cannot redirect: User is not a consultant");
            toast.error("You don't have permission to access the dashboard builder");
            return;
          }
        }
        
        // For other pages, use React Router navigation
        navigate(redirectTarget, { replace: true });
        toast.info("Redirecting you to the requested page...");
      } catch (error) {
        console.error("Navigation error:", error);
        toast.error("Failed to redirect to the requested page");
      }
    }
  }, [location, navigate, profile]);
  
  // Show error state
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[80vh]">
        <div className="text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <p className="text-base text-muted-foreground mb-4">Failed to load dashboard data</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md" 
          onClick={() => window.location.reload()}
        >
          Refresh page
        </button>
      </div>
    );
  }
  
  // Show loading state until profile is loaded
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[80vh]">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }
  
  // Determine which dashboard to show based on role
  // When impersonating, use the impersonated user's role
  const showConsultantDashboard = profile?.role === 'consultant' && !isImpersonating;
  
  return (
    <div className="w-full">
      {showConsultantDashboard ? (
        <ConsultantDashboard />
      ) : (
        <UserDashboard />
      )}
    </div>
  );
};

export default Dashboard;
