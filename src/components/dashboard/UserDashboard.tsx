
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import DashboardWelcome from './DashboardWelcome';
import QuickActionButtons from './QuickActionButtons';
import ActiveCasesList from './ActiveCasesList';
import CompanyAnnouncements from './CompanyAnnouncements';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { useCompanyAnnouncements } from '@/hooks/useCompanyAnnouncements';
import { UserCaseItem } from '@/types/dashboardTypes';

const UserDashboard = () => {
  const { currentUser, cases } = useAppContext();
  
  // Get user's cases only and map to UserCaseItem format
  const userCases: UserCaseItem[] = cases
    .filter(c => c.userId === currentUser?.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter(c => c.status !== 'completed')
    .slice(0, 3)
    .map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      updatedAt: c.updatedAt // Already a string in our updated model
    }));
  
  // Fetch company settings and announcements
  const { settings, loading: settingsLoading } = useDashboardSettings(currentUser?.companyId || '');
  const { announcements, loading: announcementsLoading } = useCompanyAnnouncements(currentUser?.companyId || '');
  
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
  
  return (
    <div className="space-y-6">
      <DashboardWelcome 
        userName={currentUser?.name.split(' ')[0] || ''} 
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
