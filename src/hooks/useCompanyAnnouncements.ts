
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyAnnouncement } from '@/types/dashboardTypes';

export const useCompanyAnnouncements = (companyId: string | undefined) => {
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    const fetchAnnouncements = async () => {
      setLoading(true);
      
      try {
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (announcementsError) {
          console.error('Error fetching announcements:', announcementsError);
          setError(announcementsError);
        } else {
          setAnnouncements(announcementsData || []);
        }
      } catch (error) {
        console.error('Error in fetching announcements:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [companyId]);

  return { announcements, loading, error };
};
