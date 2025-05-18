
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import DashboardWelcome from './DashboardWelcome';
import QuickActionButtons from './QuickActionButtons';
import ActiveCasesList from './ActiveCasesList';
import CompanyAnnouncements from './CompanyAnnouncements';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { useCompanyAnnouncements } from '@/hooks/useCompanyAnnouncements';
import { UserCaseItem } from '@/types/dashboardTypes';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const UserDashboard = () => {
  const { currentUser, cases } = useAppContext();
  const { authState } = useAuth();
  const [hasSettingsError, setHasSettingsError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Only proceed if auth is stable and user is authenticated
  const isAuthReady = authState === 'AUTHENTICATED' || authState === 'IMPERSONATING';
  
  // Wait for auth to stabilize before processing
  useEffect(() => {
    if (isAuthReady && currentUser) {
      setIsReady(true);
    } else if (authState === 'UNAUTHENTICATED') {
      // If user is unauthenticated, don't try to render dashboard
      setIsReady(false);
    }
  }, [isAuthReady, currentUser, authState]);
  
  // Don't try to process if we're not ready or user is not authenticated
  if (!isReady || !isAuthReady) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Memoize user's cases to prevent recreation on each render
  const userCases = useMemo(() => {
    if (!currentUser) return [];
    return cases
      .filter(c => c.userId === currentUser.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .filter(c => c.status !== 'completed')
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        updatedAt: c.updatedAt.toISOString() // Convert Date to string
      }));
  }, [currentUser, cases]);
  
  // IMPROVED: Better validation of companyId
  const safeCompanyId = useMemo(() => {
    return currentUser?.companyId && 
      typeof currentUser.companyId === 'string' &&
      currentUser.companyId !== "undefined" && 
      currentUser.companyId !== "null" ? 
      currentUser.companyId : undefined;
  }, [currentUser?.companyId]);
  
  // Fetch company settings and announcements
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(safeCompanyId);
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(safeCompanyId);
  
  // Track settings errors
  useEffect(() => {
    if (settingsError) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
    } else {
      setHasSettingsError(false);
    }
  }, [settingsError]);
  
  const loading = settingsLoading || announcementsLoading;
  
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Even if settings failed, show the dashboard with default settings
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
        userName={currentUser?.name?.split(' ')[0] || 'User'} 
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
