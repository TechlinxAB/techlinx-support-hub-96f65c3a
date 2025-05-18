
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, user } = useAuth();
  const { loadStarredCases } = useStarredCases();
  
  // Load starred cases on component mount when authenticated
  React.useEffect(() => {
    if (user) {
      loadStarredCases();
    }
  }, [loadStarredCases, user]);
  
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
