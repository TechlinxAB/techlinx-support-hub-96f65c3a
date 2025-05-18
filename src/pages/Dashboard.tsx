
import React, { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, user, status } = useAuth();
  const { loadStarredCases } = useStarredCases();
  
  // Load starred cases when authenticated
  useEffect(() => {
    // Only proceed if user is authenticated
    if (status === 'AUTHENTICATED' && user) {
      console.log("Dashboard: Loading starred cases for authenticated user");
      loadStarredCases();
    }
  }, [loadStarredCases, user, status]);
  
  // Show loading while waiting for profile data
  if (status === 'AUTHENTICATED' && !profile) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Loading your profile data...</p>
        </div>
      </div>
    );
  }
  
  // Show loading during initial auth check
  if (status === 'LOADING') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Safety check to prevent rendering without auth
  if (status !== 'AUTHENTICATED') {
    return null;
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
