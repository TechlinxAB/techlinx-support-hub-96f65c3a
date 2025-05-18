
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
  // Context values
  const { currentUser, cases } = useAppContext();
  const { authState } = useAuth();
  
  // Local state
  const [hasSettingsError, setHasSettingsError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const errorHandledRef = useRef(false);
  
  // Create stable primitive references to prevent hook dependency issues
  // These must be unconditionally called at the top level
  const userId = currentUser?.id;
  const userName = currentUser?.name;
  const userCompanyId = currentUser?.companyId;
  
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
  
  // Early return for loading state - must be placed after all hooks
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

  // Safely derive companyId without creating new objects
  const safeCompanyId = useMemo(() => {
    if (!userCompanyId) return undefined;
    if (typeof userCompanyId !== 'string') return undefined;
    if (userCompanyId === "undefined" || userCompanyId === "null") return undefined;
    
    return userCompanyId;
  }, [userCompanyId]); // Only depend on the userCompanyId primitive
  
  // Fetch company settings and announcements
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(safeCompanyId);
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(safeCompanyId);

  // Memoize user's cases to prevent recreation on each render
  const userCases = useMemo(() => {
    if (!userId || !cases) return [];
    
    return cases
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .filter(c => c.status !== 'completed')
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        updatedAt: c.updatedAt.toISOString() // Convert Date to string
      }));
  }, [userId, cases]);
  
  // Track settings errors - with useCallback to ensure stable function reference
  const handleSettingsError = useCallback(() => {
    if (settingsError && !errorHandledRef.current) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
      errorHandledRef.current = true;
    } else if (!settingsError) {
      setHasSettingsError(false);
      errorHandledRef.current = false;
    }
  }, [settingsError]);
  
  // Handle errors with useEffect to avoid direct function calls during render
  useEffect(() => {
    handleSettingsError();
  }, [handleSettingsError]);
  
  // Get user's first name for welcome message - ensure stable reference
  const firstName = useMemo(() => {
    return userName?.split(' ')?.[0] || 'User';
  }, [userName]);
  
  const loading = settingsLoading || announcementsLoading;
  
  // Second loading state - must be consistent across renders
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
  
  // Use the dashboard with default settings if needed
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
