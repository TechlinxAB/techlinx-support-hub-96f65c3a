
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSettings, CompanySettingsRow } from '@/types/dashboardTypes';

const defaultSettings: DashboardSettings = {
  showWelcome: true,
  showSubtitle: true,
  showNewCaseButton: true,
  showCompanyNewsButton: true,
  showCompanyDashboardButton: true,
  showActiveCases: true,
  showCompanyNotices: true,
};

export const useDashboardSettings = (companyId: string | undefined) => {
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    const fetchSettings = async () => {
      setLoading(true);
      
      try {
        // We need to use 'from' with a string argument for tables not in the typed schema
        const { data, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (settingsError) {
          console.error('Error fetching company settings:', settingsError);
          setError(settingsError);
        }
        
        if (data) {
          // Type assertion for the data returned from Supabase
          const settingsRow = data as unknown as CompanySettingsRow;
          setSettings({
            showWelcome: settingsRow.show_welcome,
            showSubtitle: settingsRow.show_subtitle,
            showNewCaseButton: settingsRow.show_new_case_button,
            showCompanyNewsButton: settingsRow.show_company_news_button,
            showCompanyDashboardButton: settingsRow.show_company_dashboard_button,
            showActiveCases: settingsRow.show_active_cases,
            showCompanyNotices: settingsRow.show_company_notices,
          });
        }
      } catch (error) {
        console.error('Error in fetching dashboard settings:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [companyId]);

  return { settings, loading, error };
};
