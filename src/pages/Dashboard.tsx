
import React, { useEffect, useState } from 'react';
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
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Wait for profile to be ready
  useEffect(() => {
    if (profile) {
      setIsReady(true);
      // Load starred cases once profile is available
      loadStarredCases();
    }
  }, [profile, loadStarredCases]);
  
  // Enhanced navigation handling with improved direct access for dashboard builder
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (redirectTarget && !navigationAttempted && profile) {
      // Mark that we've attempted navigation to prevent loops
      setNavigationAttempted(true);
      
      console.log(`Attempting to redirect to: ${redirectTarget}, user role:`, profile?.role);
      
      // For dashboard builder pages, verify role before redirecting
      if (redirectTarget.includes('company-dashboard-builder')) {
        if (profile?.role === 'consultant') {
          toast.info("Loading dashboard builder...");
          navigate(redirectTarget);
          return;
        } else {
          console.log("Cannot redirect: User is not a consultant");
          toast.error("You don't have permission to access the dashboard builder");
          return;
        }
      }
      
      // For other pages, use React Router navigation
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
    }
  }, [location, navigate, navigationAttempted, profile]);
  
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
