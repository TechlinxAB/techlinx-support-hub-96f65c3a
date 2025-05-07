
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyAnnouncement } from '@/types/dashboardTypes';

// Define backoff strategy parameters
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const CACHE_TTL = 60000; // 1 minute cache validity

export const useCompanyAnnouncements = (companyId: string | undefined) => {
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if component is mounted (to avoid state updates after unmount)
  const isMounted = useRef(true);
  
  // Use ref to track active request to prevent multiple simultaneous requests
  const activeRequest = useRef<AbortController | null>(null);
  
  // Use cache to prevent redundant fetches
  const cache = useRef<{
    companyId: string,
    data: CompanyAnnouncement[],
    timestamp: number
  } | null>(null);

  useEffect(() => {
    // Set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
      
      // Abort any in-flight requests when component unmounts
      if (activeRequest.current) {
        activeRequest.current.abort();
        activeRequest.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous errors when companyId changes
    setError(null);
    
    // Cancel any in-progress fetches when companyId changes
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    // Check if we have a valid cached response
    const now = Date.now();
    if (cache.current && 
        cache.current.companyId === companyId &&
        now - cache.current.timestamp < CACHE_TTL) {
      // Use cached data
      setAnnouncements(cache.current.data);
      setLoading(false);
      return;
    }
    
    const fetchAnnouncementsWithRetry = async (retryCount = 0) => {
      // Don't attempt if component is unmounted
      if (!isMounted.current) return;
      
      // If we've exhausted retries, give up
      if (retryCount >= MAX_RETRIES) {
        if (isMounted.current) {
          setError(new Error(`Failed to fetch announcements after ${MAX_RETRIES} attempts`));
          setLoading(false);
        }
        return;
      }
      
      try {
        // Create abort controller for this request
        activeRequest.current = new AbortController();
        
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3)
          .abortSignal(activeRequest.current.signal);
        
        // After request completes, clear the reference
        activeRequest.current = null;
        
        if (announcementsError) {
          console.error('Error fetching announcements:', announcementsError);
          throw announcementsError;
        }
        
        if (isMounted.current) {
          const result = announcementsData || [];
          setAnnouncements(result);
          setLoading(false);
          
          // Cache the successful response
          cache.current = {
            companyId,
            data: result,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        // If the request was aborted, don't retry or set error state
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Announcements fetch aborted');
          return;
        }
        
        console.error(`Error in fetching announcements (attempt ${retryCount + 1}):`, error);
        
        // If we're still mounted, retry with exponential backoff
        if (isMounted.current) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);
          
          setTimeout(() => {
            fetchAnnouncementsWithRetry(retryCount + 1);
          }, delay);
        }
      }
    };
    
    // Start the fetch process
    setLoading(true);
    fetchAnnouncementsWithRetry();
    
  }, [companyId]);

  return { announcements, loading, error };
};
