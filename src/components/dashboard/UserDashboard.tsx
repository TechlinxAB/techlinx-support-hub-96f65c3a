
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import DashboardWelcome from './DashboardWelcome';
import QuickActionButtons from './QuickActionButtons';
import ActiveCasesList from './ActiveCasesList';
import CompanyAnnouncements from './CompanyAnnouncements';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { useCompanyAnnouncements } from '@/hooks/useCompanyAnnouncements';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const UserDashboard = () => {
  // Core hooks must be called unconditionally at the top level
  const { currentUser, cases } = useAppContext();
  const { authState } = useAuth();
  
  // Local state
  const [isReady, setIsReady] = useState(false);
  const [hasSettingsError, setHasSettingsError] = useState(false);
  
  // Wait for auth to stabilize before processing
  useEffect(() => {
    if ((authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') && currentUser) {
      setIsReady(true);
    } else if (authState === 'UNAUTHENTICATED') {
      setIsReady(false);
    }
  }, [authState, currentUser]);
  
  // Show loading state until ready
  if (!isReady) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Safe extraction of company ID - only after we've confirmed currentUser exists
  const companyId = currentUser?.companyId;
  const safeCompanyId = typeof companyId === 'string' && 
                        companyId !== 'undefined' && 
                        companyId !== 'null' ? 
                        companyId : undefined;
  
  // Fetch data with the safe company ID
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(safeCompanyId);
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(safeCompanyId);
  
  // Handle settings error
  useEffect(() => {
    if (settingsError) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
    } else {
      setHasSettingsError(false);
    }
  }, [settingsError]);
  
  // Filter user cases - simple function call, not a hook
  const getUserCases = () => {
    if (!currentUser?.id || !cases) return [];
    
    return cases
      .filter(c => c.userId === currentUser.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .filter(c => c.status !== 'completed')
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        updatedAt: c.updatedAt.toISOString()
      }));
  };
  
  const userCases = getUserCases();
  const firstName = currentUser?.name?.split(' ')?.[0] || 'User';
  
  // Show loading state for settings and announcements
  if (settingsLoading || announcementsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Render the dashboard
  return (
    <div className="space-y-6">
      {hasSettingsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-800 text-sm font-medium">
              Some dashboard settings could not be loaded
            </p>
            <p className="text-amber-700 text-xs mt-1">
              Using default settings instead. This won't affect your ability to use the dashboard.
            </p>
          </div>
        </div>
      )}
      
      <DashboardWelcome 
        userName={firstName}
        settings={settings} 
      />
      
      <QuickActionButtons settings={settings} />
      
      <ActiveCasesList cases={userCases} settings={settings} />
      
      <CompanyAnnouncements 
        announcements={announcements} 
        settings={settings} 
      />
    </div>
  );
};

export default UserDashboard;
