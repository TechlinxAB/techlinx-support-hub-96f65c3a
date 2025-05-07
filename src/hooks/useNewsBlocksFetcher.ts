
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyNewsBlock } from '@/types/companyNews';
import { toast } from 'sonner';

export const useNewsBlocksFetcher = (companyId: string | undefined) => {
  const [blocks, setBlocks] = useState<CompanyNewsBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Cache fetched data with longer TTL
  const cachedData = useRef<{
    companyId: string | undefined,
    data: CompanyNewsBlock[],
    timestamp: number,
    etag?: string
  } | null>(null);

  // Tracking fetch state
  const isMounted = useRef(true);
  const activeRequest = useRef<AbortController | null>(null);
  const lastFetchTime = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 5000; // Increased to 5 seconds between fetches
  const CACHE_TTL = 30000; // Cache valid for 30 seconds (increased significantly)
  
  // Flag to track if a fetch was forced
  const fetchForced = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (activeRequest.current) {
        activeRequest.current.abort();
        activeRequest.current = null;
      }
    };
  }, []);

  // Update local blocks without refetching
  const updateLocalBlock = useCallback((updatedBlock: Partial<CompanyNewsBlock> & { id: string }) => {
    setBlocks(currentBlocks => {
      return currentBlocks.map(block => 
        block.id === updatedBlock.id 
          ? { ...block, ...updatedBlock, updatedAt: new Date() } 
          : block
      );
    });
    
    // Also update cache if it exists
    if (cachedData.current) {
      cachedData.current.data = cachedData.current.data.map(block => 
        block.id === updatedBlock.id 
          ? { ...block, ...updatedBlock, updatedAt: new Date() } 
          : block
      );
    }
  }, []);

  const fetchNewsBlocks = useCallback(async (force = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    fetchForced.current = force;

    // Return cached data if available and not forced refresh with increased TTL
    const now = Date.now();
    if (
      !force && 
      cachedData.current?.companyId === companyId && 
      now - cachedData.current.timestamp < CACHE_TTL
    ) {
      console.log("Using cached news blocks data");
      setBlocks(cachedData.current.data);
      setLoading(false);
      return;
    }

    // Prevent too frequent fetches with much stronger throttling
    if (!force && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
      console.log("Fetch attempted too soon, skipping");
      return;
    }

    // Cancel any in-progress requests
    if (activeRequest.current) {
      console.log("Cancelling in-progress fetch");
      activeRequest.current.abort();
    }

    // Start new request
    setLoading(true);
    lastFetchTime.current = now;
    activeRequest.current = new AbortController();

    try {
      console.log(`Fetching news blocks for company ${companyId}`);
      const fetchStartTime = performance.now();
      
      const { data, error } = await supabase
        .from('company_news_blocks')
        .select('*')
        .eq('company_id', companyId)
        .abortSignal(activeRequest.current.signal);

      const fetchTime = performance.now() - fetchStartTime;
      console.log(`Fetch completed in ${fetchTime.toFixed(2)}ms`);

      if (!isMounted.current) return;
      activeRequest.current = null;

      if (error) throw error;

      // Transform the data to match CompanyNewsBlock type
      const transformedBlocks: CompanyNewsBlock[] = data 
        ? data.map(block => ({
            id: block.id,
            companyId: block.company_id,
            title: block.title,
            content: block.content,
            type: block.type as any,
            position: block.position,
            parentId: block.parent_id || undefined,
            createdAt: new Date(block.created_at),
            updatedAt: new Date(block.updated_at),
            createdBy: block.created_by,
            isPublished: block.is_published || false
          }))
        : [];

      // Sort the blocks by position
      const sortedBlocks = transformedBlocks.sort((a, b) => a.position - b.position);

      setBlocks(sortedBlocks);
      setError(null);

      // Cache the fetched data with longer TTL
      cachedData.current = {
        companyId,
        data: sortedBlocks,
        timestamp: now
      };
      
      // Only show fetch success toast if it was forced
      if (force && fetchForced.current) {
        toast.success("Content refreshed", { duration: 2000 });
      }
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log("Fetch was aborted");
        return;
      }

      if (isMounted.current) {
        console.error('Error fetching news blocks:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // Only show toast for forced fetches to avoid spamming the user
        if (force && fetchForced.current) {
          toast.error("Failed to load news content", {
            description: err.message || "Please try again"
          });
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchForced.current = false;
    }
  }, [companyId]);

  // Fetch initial data only once
  useEffect(() => {
    // When companyId changes, clear cache
    if (cachedData.current?.companyId !== companyId) {
      cachedData.current = null;
      fetchNewsBlocks(true);
    } else if (!cachedData.current) {
      fetchNewsBlocks(true);
    }
  }, [companyId, fetchNewsBlocks]);

  // Public API
  return { 
    blocks, 
    loading, 
    error, 
    refetch: (force = true) => fetchNewsBlocks(force),
    updateLocalBlock, // New method to update a block locally without refetching
    lastFetchTime: lastFetchTime.current,
    isCacheValid: cachedData.current && Date.now() - cachedData.current.timestamp < CACHE_TTL
  };
};
