
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyNewsBlock } from '@/types/companyNews';

// Define the structure for recent news items
export interface RecentNewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  type: string;
}

// Define backoff strategy parameters
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const CACHE_TTL = 60000; // 1 minute cache validity

export const useRecentNews = (companyId: string | undefined) => {
  const [recentNews, setRecentNews] = useState<RecentNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Use ref to track active request
  const activeRequest = useRef<AbortController | null>(null);
  
  // Use cache to prevent redundant fetches
  const cache = useRef<{
    companyId: string,
    data: RecentNewsItem[],
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

  // Helper function to extract readable content from news block content
  const extractContentText = (content: any, type: string): string => {
    if (!content) return '';
    
    switch (type) {
      case 'text':
        return content.text || '';
      case 'heading':
        return content.text || '';
      case 'card':
        return content.content || content.title || '';
      case 'notice':
        return content.message || content.title || '';
      case 'faq':
        if (content.items && content.items.length > 0) {
          return content.items[0].question || '';
        }
        return '';
      default:
        // For other types, try to extract any text content
        if (typeof content === 'string') return content;
        if (content.text) return content.text;
        if (content.content) return content.content;
        if (content.message) return content.message;
        if (content.title) return content.title;
        return '';
    }
  };

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
      setRecentNews(cache.current.data);
      setLoading(false);
      return;
    }
    
    const fetchRecentNewsWithRetry = async (retryCount = 0) => {
      // Don't attempt if component is unmounted
      if (!isMounted.current) return;
      
      // If we've exhausted retries, give up
      if (retryCount >= MAX_RETRIES) {
        if (isMounted.current) {
          setError(new Error(`Failed to fetch recent news after ${MAX_RETRIES} attempts`));
          setLoading(false);
        }
        return;
      }
      
      try {
        // Create abort controller for this request
        activeRequest.current = new AbortController();
        
        const { data: newsData, error: newsError } = await supabase
          .from('company_news_blocks')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(activeRequest.current.signal);
        
        // After request completes, clear the reference
        activeRequest.current = null;
        
        if (newsError) {
          console.error('Error fetching recent news:', newsError);
          throw newsError;
        }
        
        if (isMounted.current) {
          const processedNews: RecentNewsItem[] = (newsData || []).map(block => ({
            id: block.id,
            title: block.title,
            content: extractContentText(block.content, block.type),
            created_at: block.created_at,
            type: block.type
          }));
          
          setRecentNews(processedNews);
          setLoading(false);
          
          // Cache the successful response
          cache.current = {
            companyId,
            data: processedNews,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        // If the request was aborted, don't retry or set error state
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Recent news fetch aborted');
          return;
        }
        
        console.error(`Error in fetching recent news (attempt ${retryCount + 1}):`, error);
        
        // If we're still mounted, retry with exponential backoff
        if (isMounted.current) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);
          
          setTimeout(() => {
            fetchRecentNewsWithRetry(retryCount + 1);
          }, delay);
        }
      }
    };
    
    // Start the fetch process
    setLoading(true);
    fetchRecentNewsWithRetry();
    
  }, [companyId]);

  return { recentNews, loading, error };
};
