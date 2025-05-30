
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import DashboardWelcome from './DashboardWelcome';
import QuickActionButtons from './QuickActionButtons';
import ActiveCasesList from './ActiveCasesList';
import RecentNews from './RecentNews';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { useRecentNews } from '@/hooks/useRecentNews';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const UserDashboard = () => {
  const { currentUser, cases } = useAppContext();
  const { profile } = useAuth();
  const [hasSettingsError, setHasSettingsError] = useState(false);
  
  // Process companyId
  const companyId = currentUser?.companyId || undefined;
  
  // Fetch data
  const { settings, loading: settingsLoading, error: settingsError } = useDashboardSettings(companyId);
  const { recentNews, loading: recentNewsLoading } = useRecentNews(companyId);
  
  // Handle settings errors
  useEffect(() => {
    if (settingsError) {
      console.error("Dashboard settings error:", settingsError);
      setHasSettingsError(true);
    } else {
      setHasSettingsError(false);
    }
  }, [settingsError]);
  
  // Loading state
  if (!profile || settingsLoading || recentNewsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Process user cases
  const userCases = !currentUser?.id || !cases 
    ? [] 
    : cases
        .filter(c => c.userId === currentUser.id)
        .sort((a, b) => {
          const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return dateB.getTime() - dateA.getTime();
        })
        .filter(c => c.status !== 'completed')
        .slice(0, 3)
        .map(c => ({
          id: c.id,
          title: c.title,
          status: c.status,
          updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : new Date(c.updatedAt).toISOString()
        }));
  
  // Extract first name
  const firstName = profile?.name?.split(' ')?.[0] || 'User';
  
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
      
      <RecentNews 
        recentNews={recentNews} 
        settings={settings}
        companyId={companyId}
      />
    </div>
  );
};

export default UserDashboard;
