
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { DashboardSettings } from '@/types/dashboardTypes';

// Default dashboard settings
const defaultSettings: DashboardSettings = {
  showWelcome: true,
  showSubtitle: true,
  showNewCaseButton: true,
  showCompanyNewsButton: true,
  showCompanyDashboardButton: true,
  showActiveCases: true,
  showCompanyNotices: true
};

export const useDashboardSettings = (companyId?: string) => {
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    const fetchDashboardSettings = async () => {
      // In a real implementation, this would fetch from a database
      // For now, we'll simulate a fetch with a timeout
      try {
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // For now, just return the default settings
        // In a real implementation, this would come from an API or database
        setSettings({
          ...defaultSettings,
          // You could customize based on companyId here if needed
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard settings:", err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching dashboard settings'));
        setLoading(false);
        toast.error("Failed to load dashboard settings", {
          description: "Using default settings instead"
        });
      }
    };

    fetchDashboardSettings();
  }, [companyId, session]);

  return { settings, loading, error, setSettings };
};
