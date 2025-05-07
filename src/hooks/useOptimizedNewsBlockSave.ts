
import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SaveOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useOptimizedNewsBlockSave = () => {
  const [saving, setSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const saveInProgress = useRef<boolean>(false);
  const saveQueue = useRef<Map<string, {data: any, options?: SaveOptions}>>(new Map());

  // Store pending saves to prevent duplicate submissions
  const pendingSaves = useRef(new Map<string, NodeJS.Timeout>());

  const cancelPendingSave = (blockId: string) => {
    if (pendingSaves.current.has(blockId)) {
      clearTimeout(pendingSaves.current.get(blockId));
      pendingSaves.current.delete(blockId);
    }
  };

  // Process the save queue
  const processQueue = useCallback(async () => {
    if (saveInProgress.current || saveQueue.current.size === 0) return;
    
    saveInProgress.current = true;
    const [blockId, { data, options }] = Array.from(saveQueue.current.entries())[0];
    saveQueue.current.delete(blockId);
    
    try {
      setSaving(true);
      const startTime = performance.now();
      
      // Log save operation details for debugging
      console.log(`Starting save for block ${blockId} at ${new Date().toISOString()}`);
      const contentSize = data.content ? JSON.stringify(data.content).length : 0;
      console.log(`Content size: ${contentSize} bytes`);
      
      // Perform the update with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timed out')), 10000); // 10 second timeout
      });

      const updatePromise = supabase
        .from('company_news_blocks')
        .update(data)
        .eq('id', blockId);

      // Race between the timeout and the update
      await Promise.race([updatePromise, timeoutPromise]);
      
      // Calculate and log performance metrics
      const saveTime = performance.now() - startTime;
      console.log(`Save completed in ${saveTime.toFixed(2)}ms`);
      setLastSaveTime(saveTime);
      
      // Show success toast with performance info
      toast({
        title: "Success",
        description: `Changes saved (${saveTime.toFixed(0)}ms)`,
        duration: 2000
      });
      
      options?.onSuccess?.();
    } catch (error) {
      console.error('Error saving news block:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
      
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSaving(false);
      saveInProgress.current = false;
      
      // Process next item in queue if any
      setTimeout(() => {
        processQueue();
      }, 300); // Add small delay between requests
    }
  }, []);

  const saveNewsBlock = useCallback(async (
    blockId: string, 
    data: Partial<any>, 
    options?: SaveOptions
  ) => {
    // Cancel any pending saves for this block
    cancelPendingSave(blockId);
    
    // Add to save queue and process
    saveQueue.current.set(blockId, { data, options });
    processQueue();
  }, [processQueue]);

  // Debounced save function
  const debouncedSave = useCallback((
    blockId: string, 
    data: Partial<any>, 
    delay: number = 1000,
    options?: SaveOptions
  ) => {
    // Cancel any pending saves for this block
    cancelPendingSave(blockId);
    
    // Create a new debounced save
    const timeoutId = setTimeout(() => {
      saveNewsBlock(blockId, data, options);
      pendingSaves.current.delete(blockId);
    }, delay);
    
    // Store the timeout ID
    pendingSaves.current.set(blockId, timeoutId);
    
    return () => {
      cancelPendingSave(blockId);
    };
  }, [saveNewsBlock]);

  return {
    saving,
    saveNewsBlock,
    debouncedSave,
    lastSaveTime,
    cancelPendingSave,
    queueSize: saveQueue.current.size
  };
};
