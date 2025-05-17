
import React, { useEffect } from 'react';
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
  
  // Load starred cases on component mount
  useEffect(() => {
    loadStarredCases();
  }, [loadStarredCases]);
  
  // Check if we're coming back from a failed navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirectTarget');
    
    if (redirectTarget) {
      // Remove the redirectTarget from the URL
      navigate(redirectTarget, { replace: true });
      toast.info("Redirecting you to the requested page...");
    }
  }, [location, navigate]);
  
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
