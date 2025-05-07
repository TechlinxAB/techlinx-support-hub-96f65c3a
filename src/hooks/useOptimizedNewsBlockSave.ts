
import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SaveOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
}

export const useOptimizedNewsBlockSave = () => {
  const [saving, setSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const saveInProgress = useRef<boolean>(false);
  const saveQueue = useRef<Map<string, {data: any, options?: SaveOptions}>>(new Map());
  const saveStartTime = useRef<number | null>(null);

  // Store pending saves to prevent duplicate submissions
  const pendingSaves = useRef(new Map<string, NodeJS.Timeout>());

  const cancelPendingSave = (blockId: string) => {
    if (pendingSaves.current.has(blockId)) {
      clearTimeout(pendingSaves.current.get(blockId));
      pendingSaves.current.delete(blockId);
    }
  };

  // Process the save queue with better UI feedback and timeout handling
  const processQueue = useCallback(async () => {
    if (saveInProgress.current || saveQueue.current.size === 0) return;
    
    saveInProgress.current = true;
    const [blockId, { data, options }] = Array.from(saveQueue.current.entries())[0];
    saveQueue.current.delete(blockId);
    
    try {
      // Call onStart callback if provided
      options?.onStart?.();
      
      setSaving(true);
      saveStartTime.current = performance.now();
      
      // Show a loading toast for long operations
      const toastId = toast({
        title: "Saving changes",
        description: "Please wait...",
        duration: 30000 // Long duration in case save takes time
      });
      
      // Log save operation details for debugging
      console.log(`Starting save for block ${blockId} at ${new Date().toISOString()}`);
      const contentSize = data.content ? JSON.stringify(data.content).length : 0;
      console.log(`Content size: ${contentSize} bytes`);
      
      // Add a small delay to ensure UI feedback is visible
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Perform the update with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timed out after 15 seconds')), 15000);
      });

      // Break large content into smaller operations if needed
      let updatePromise;
      
      if (contentSize > 100000) {
        console.log("Large content detected, using optimized save approach");
        // For extremely large content, consider more optimized approaches
        updatePromise = supabase
          .from('company_news_blocks')
          .update(data)
          .eq('id', blockId);
      } else {
        updatePromise = supabase
          .from('company_news_blocks')
          .update(data)
          .eq('id', blockId);
      }

      // Race between the timeout and the update
      const { error } = await Promise.race([
        updatePromise,
        timeoutPromise
      ]) as any;
      
      if (error) throw error;
      
      // Calculate and log performance metrics
      const saveTime = performance.now() - (saveStartTime.current || 0);
      console.log(`Save completed in ${saveTime.toFixed(2)}ms`);
      setLastSaveTime(saveTime);
      
      // Clear the loading toast and show success
      toast({
        id: toastId,
        title: "Success",
        description: `Changes saved (${saveTime.toFixed(0)}ms)`,
        duration: 3000
      });
      
      options?.onSuccess?.();
    } catch (error) {
      console.error('Error saving news block:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
        duration: 5000
      });
      
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSaving(false);
      saveInProgress.current = false;
      saveStartTime.current = null;
      
      // Process next item in queue with a delay
      setTimeout(() => {
        processQueue();
      }, 500); // Increased delay between requests
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
    
    // Let the UI know a save is starting
    options?.onStart?.();
    
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
    queueSize: saveQueue.current.size,
    isSaving: saveInProgress.current
  };
};
