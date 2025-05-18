
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
      setError(null);
      
      try {
        // Use maybeSingle instead of single to handle the case where no settings exist
        const { data, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (settingsError) {
          console.error('Error fetching company settings:', settingsError);
          setError(settingsError instanceof Error ? settingsError : new Error(String(settingsError)));
          return;
        }
        
        if (data) {
          // Type assertion for the data returned from Supabase
          const settingsRow = data as unknown as CompanySettingsRow;
          setSettings({
            showWelcome: settingsRow.show_welcome ?? true,
            showSubtitle: settingsRow.show_subtitle ?? true,
            showNewCaseButton: settingsRow.show_new_case_button ?? true,
            showCompanyNewsButton: settingsRow.show_company_news_button ?? true,
            showCompanyDashboardButton: settingsRow.show_company_dashboard_button ?? true,
            showActiveCases: settingsRow.show_active_cases ?? true,
            showCompanyNotices: settingsRow.show_company_notices ?? true,
          });
        } else {
          // If no settings found, use defaults
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Error in fetching dashboard settings:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [companyId]);

  return { settings, loading, error };
};
