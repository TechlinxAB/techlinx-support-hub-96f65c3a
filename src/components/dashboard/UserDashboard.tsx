
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const { currentUser, cases } = useAppContext();
  const { authState } = useAuth();
  
  // Local state
  const [hasSettingsError, setHasSettingsError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const errorHandledRef = useRef(false);
  
  // Wait for auth to stabilize before processing
  useEffect(() => {
    if ((authState === 'AUTHENTICATED' || authState === 'IMPERSONATING') && currentUser) {
      setIsReady(true);
    } else if (authState === 'UNAUTHENTICATED') {
      // If user is unauthenticated, don't try to render dashboard
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
  
  // Process safe company ID - do this after ready check to ensure currentUser exists
  const safeCompanyId = (() => {
    const companyId = currentUser?.companyId;
    if (!companyId) return undefined;
    if (typeof companyId !== 'string') return undefined;
    if (companyId === "undefined" || companyId === "null") return undefined;
    return companyId;
  })();
  
  // Fetch data - these will be skipped if not ready
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(safeCompanyId);
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(safeCompanyId);
  
  // Filter user cases - do this after all other hooks
  const userCases = (() => {
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
  })();
  
  // Handle settings error - use useEffect to avoid direct function calls during render
  useEffect(() => {
    if (settingsError && !errorHandledRef.current) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
      errorHandledRef.current = true;
    } else if (!settingsError) {
      setHasSettingsError(false);
      errorHandledRef.current = false;
    }
  }, [settingsError]);
  
  // Get first name for welcome message
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
