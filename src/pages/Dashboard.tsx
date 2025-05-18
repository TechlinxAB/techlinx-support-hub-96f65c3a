
import React, { useEffect, useRef } from 'react';
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
  
  // Refs to prevent duplicate loading
  const loadingStarted = useRef(false);
  const loadingComplete = useRef(false);
  
  // Load starred cases on component mount when authenticated
  useEffect(() => {
    // Skip if already loading or complete
    if (loadingStarted.current) return;
    
    // Only proceed if fully authenticated and user exists
    if (status === 'AUTHENTICATED' && user) {
      // Mark loading as started
      loadingStarted.current = true;
      
      console.log("Dashboard: Loading starred cases for authenticated user");
      
      // Add a small delay to avoid potential race conditions
      const timer = setTimeout(() => {
        try {
          loadStarredCases();
          loadingComplete.current = true;
        } catch (error) {
          console.error("Error loading starred cases:", error);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loadStarredCases, user, status]);
  
  // Show a loading state if authenticated but profile is not available yet
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
  
  // Show loading if we're still in the initial loading state
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
  
  // If not authenticated, this should never render due to ProtectedRoute,
  // but adding a safety check anyway
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
