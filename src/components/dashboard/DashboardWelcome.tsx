
import React from 'react';
import { DashboardSettings } from '@/types/dashboardTypes';

interface DashboardWelcomeProps {
  userName: string;
  settings: DashboardSettings;
}

const DashboardWelcome = ({ userName, settings }: DashboardWelcomeProps) => {
  if (!settings.showWelcome) return null;
  
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Hi {userName}, how can we help you today?
      </h1>
      {settings.showSubtitle && (
        <p className="text-muted-foreground mt-1">
          Check company news, submit a case, or visit your company's IT resources.
        </p>
      )}
    </div>
  );
};

export default DashboardWelcome;
