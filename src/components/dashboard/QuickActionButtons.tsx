
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, BellRing, BookOpen } from 'lucide-react';
import { DashboardSettings } from '@/types/dashboardTypes';

interface QuickActionButtonsProps {
  settings: DashboardSettings;
}

const QuickActionButtons = ({ settings }: QuickActionButtonsProps) => {
  const navigate = useNavigate();
  
  if (!settings.showNewCaseButton && !settings.showCompanyNewsButton && !settings.showCompanyDashboardButton) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {settings.showNewCaseButton && (
        <Button 
          onClick={() => navigate('/cases/new')} 
          className="h-auto py-6 flex flex-col gap-2"
        >
          <Plus className="h-8 w-8" />
          <span>New Case</span>
        </Button>
      )}
      
      {settings.showCompanyNewsButton && (
        <Button 
          variant="outline" 
          className="h-auto py-6 flex flex-col gap-2"
          onClick={() => {
            // Scroll to announcements section
            const element = document.getElementById('company-notices');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <BellRing className="h-8 w-8" />
          <span>View Company News</span>
        </Button>
      )}
      
      {settings.showCompanyDashboardButton && (
        <Button 
          variant="outline" 
          className="h-auto py-6 flex flex-col gap-2"
          onClick={() => navigate('/company-dashboard')}
        >
          <BookOpen className="h-8 w-8" />
          <span>Visit Company Dashboard</span>
        </Button>
      )}
    </div>
  );
};

export default QuickActionButtons;
