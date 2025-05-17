
import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { loadStarredCases } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  
  // Load starred cases on component mount
  useEffect(() => {
    loadStarredCases();
  }, [loadStarredCases]);
  
  // Enhanced navigation handling with improved direct access for dashboard builder
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (redirectTarget && !navigationAttempted) {
      // Mark that we've attempted navigation to prevent loops
      setNavigationAttempted(true);
      
      console.log(`Attempting to redirect to: ${redirectTarget}`);
      
      // For dashboard builder pages, use direct location change
      if (redirectTarget.includes('company-dashboard-builder')) {
        toast.info("Loading dashboard builder...");
        window.location.href = redirectTarget;
        return;
      }
      
      // For other pages, use React Router navigation
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
    }
  }, [location, navigate, navigationAttempted]);
  
  return (
    <>
      {currentUser?.role === 'consultant' ? (
        <ConsultantDashboard />
      ) : (
        <UserDashboard />
      )}
    </>
  );
};

export default Dashboard;
