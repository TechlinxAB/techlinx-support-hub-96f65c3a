import React, { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import UserDashboard from '@/components/dashboard/UserDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import { useStarredCases } from '@/hooks/useStarredCases';
import { useAuth } from '@/context/AuthContext';
import { Loader } from 'lucide-react';
import PageTransition from "@/components/layout/PageTransition";

const Dashboard = () => {
  const { currentUser } = useAppContext();
  const { profile, loading } = useAuth();
  const { loadStarredCases } = useStarredCases();
  
  // Load starred cases when component mounts
  useEffect(() => {
    if (profile) {
      try {
        loadStarredCases();
      } catch (error) {
        console.error("Error loading starred cases:", error);
      }
    }
  }, [profile, loadStarredCases]);
  
  // Show loading state
  if (loading || !profile || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[80vh]">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading dashboard content...</p>
      </div>
    );
  }
  
  // Determine which dashboard to show based on user role
  const showConsultantDashboard = profile.role === 'consultant';
  
  return (
    <PageTransition>
      <div className="w-full">
        {showConsultantDashboard ? (
          <ConsultantDashboard />
        ) : (
          <UserDashboard />
        )}
      </div>
    </PageTransition>
  );
};

export default Dashboard;
