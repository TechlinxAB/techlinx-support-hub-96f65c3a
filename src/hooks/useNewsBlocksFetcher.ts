
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyNewsBlock } from '@/types/companyNews';

export const useNewsBlocksFetcher = (companyId: string | undefined) => {
  const [blocks, setBlocks] = useState<CompanyNewsBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if component is mounted to prevent state updates on unmounted components
  const isMounted = useRef(true);
  
  // Track active request to allow cancellation
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (activeRequest.current) {
        activeRequest.current.abort();
      }
    };
  }, []);

  const fetchBlocks = useCallback(async (showRefreshToast = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Cancel any existing request
      if (activeRequest.current) {
        activeRequest.current.abort();
      }
      
      // Create new abort controller
      activeRequest.current = new AbortController();

      const { data, error: fetchError } = await supabase
        .from('company_news_blocks')
        .select('*')
        .eq('company_id', companyId)
        .order('position', { ascending: true })
        .abortSignal(activeRequest.current.signal);

      // Clear the active request reference
      activeRequest.current = null;

      if (fetchError) {
        throw fetchError;
      }

      if (isMounted.current) {
        const processedBlocks: CompanyNewsBlock[] = (data || []).map(block => ({
          id: block.id,
          companyId: block.company_id,
          type: block.type,
          content: block.content,
          title: block.title,
          position: block.position,
          parentId: block.parent_id,
          createdAt: new Date(block.created_at),
          updatedAt: new Date(block.updated_at),
          createdBy: block.created_by,
          isPublished: block.is_published
        }));

        setBlocks(processedBlocks);
        setError(null);
      }
    } catch (err) {
      // Handle aborted requests gracefully
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Fetch request was aborted');
        return;
      }

      console.error('Error fetching news blocks:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch news blocks'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [companyId]);

  // Initial fetch
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const refetch = useCallback((showRefreshToast = false) => {
    return fetchBlocks(showRefreshToast);
  }, [fetchBlocks]);

  const updateLocalBlock = useCallback((blockId: string, updates: Partial<CompanyNewsBlock>) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, ...updates } : block
      )
    );
  }, []);

  return {
    blocks,
    loading,
    error,
    refetch,
    updateLocalBlock
  };
};
