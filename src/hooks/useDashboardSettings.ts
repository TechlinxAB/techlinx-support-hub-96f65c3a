
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSettings, CompanySettingsRow } from '@/types/dashboardTypes';
import { useAuth } from '@/context/AuthContext';

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
  const fetchAttemptsRef = useRef(0);
  const maxAttempts = 3;
  const { authState } = useAuth();
  
  // Only fetch if auth is fully established
  const isAuthReady = authState === 'AUTHENTICATED' || authState === 'IMPERSONATING';

  useEffect(() => {
    // Reset state when companyId changes
    setSettings(defaultSettings);
    setLoading(true);
    setError(null);
    fetchAttemptsRef.current = 0;
    
    // Skip fetch if authentication is not ready
    if (!isAuthReady) {
      console.log("Skipping dashboard settings fetch - auth not ready:", authState);
      setLoading(false);
      return;
    }
    
    // Skip fetch if companyId is invalid
    if (!companyId || companyId === "undefined" || companyId === "null") {
      console.log("Skipping dashboard settings fetch - invalid companyId:", companyId);
      setLoading(false);
      return;
    }
    
    const fetchSettings = async () => {
      if (fetchAttemptsRef.current >= maxAttempts) {
        console.log(`Max fetch attempts (${maxAttempts}) reached for company settings`);
        setLoading(false);
        return;
      }
      
      fetchAttemptsRef.current += 1;
      setLoading(true);
      
      try {
        console.log(`Fetching company settings for companyId: ${companyId}`);
        
        // Use proper error handling that won't affect auth state
        const { data, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (settingsError) {
          console.error('Error fetching company settings:', settingsError);
          setError(settingsError instanceof Error ? settingsError : new Error(String(settingsError)));
          
          // If we get a 401/403, don't retry - this will prevent auth loops
          if (settingsError.code === '401' || settingsError.code === '403') {
            console.log('Authorization error fetching settings, using defaults');
            setLoading(false);
            return;
          }
        }
        
        if (data) {
          console.log('Company settings found, applying to dashboard');
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
          console.log('No company settings found, using defaults');
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Exception in fetching dashboard settings:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Still maintain the default settings
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay before fetching settings to ensure auth is stable
    const timeoutId = setTimeout(() => {
      fetchSettings();
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [companyId, isAuthReady, authState]);

  return { settings, loading, error };
};
