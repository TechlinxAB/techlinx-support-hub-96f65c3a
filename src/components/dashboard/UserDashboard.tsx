
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
  // Important: All hooks must be called unconditionally at the top level
  const { currentUser, cases } = useAppContext();
  const { authState } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasSettingsError, setHasSettingsError] = useState(false);
  
  // Process companyId safely
  const safeCompanyId = 
    currentUser?.companyId && 
    typeof currentUser.companyId === 'string' &&
    currentUser.companyId !== 'undefined' && 
    currentUser.companyId !== 'null'
      ? currentUser.companyId 
      : undefined;
  
  // Call hooks - these must be called on every render in the same order
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(safeCompanyId);
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(safeCompanyId);
  
  // Set readiness state based on auth status
  useEffect(() => {
    if ((authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') && currentUser) {
      setIsReady(true);
    } else if (authState === 'UNAUTHENTICATED') {
      setIsReady(false);
    }
  }, [authState, currentUser]);
  
  // Handle settings errors
  useEffect(() => {
    if (settingsError) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
    } else {
      setHasSettingsError(false);
    }
  }, [settingsError]);
  
  // Loading state component
  const loadingContent = (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );

  // Early return for loading states
  if (!isReady || settingsLoading || announcementsLoading) {
    return loadingContent;
  }
  
  // Process user cases - do this AFTER all hook calls
  const userCases = !currentUser?.id || !cases 
    ? [] 
    : cases
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
  
  // Extract first name
  const firstName = currentUser?.name?.split(' ')?.[0] || 'User';
  
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
