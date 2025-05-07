
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SaveOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  showToast?: boolean;
}

export const useOptimizedNewsBlockSave = () => {
  const [saving, setSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const saveInProgress = useRef<boolean>(false);
  const saveQueue = useRef<Map<string, {data: any, options?: SaveOptions}>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  // Store pending saves to prevent duplicate submissions
  const pendingSaves = useRef(new Map<string, NodeJS.Timeout>());
  
  // Throttle settings
  const MIN_SAVE_INTERVAL = 1000; // Minimum time between save operations
  const lastSaveTimestamp = useRef<number>(0);

  const cancelPendingSave = (blockId: string) => {
    if (pendingSaves.current.has(blockId)) {
      clearTimeout(pendingSaves.current.get(blockId));
      pendingSaves.current.delete(blockId);
    }
    
    // Also cancel any in-flight requests for this block
    if (abortControllers.current.has(blockId)) {
      abortControllers.current.get(blockId)?.abort();
      abortControllers.current.delete(blockId);
    }
  };

  // Process the save queue with better request handling and throttling
  const processQueue = useCallback(async () => {
    if (saveInProgress.current || saveQueue.current.size === 0) return;
    
    // Throttle save operations
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimestamp.current;
    if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
      // Schedule next attempt after the throttle period
      setTimeout(() => {
        processQueue();
      }, MIN_SAVE_INTERVAL - timeSinceLastSave);
      return;
    }
    
    saveInProgress.current = true;
    const [blockId, { data, options }] = Array.from(saveQueue.current.entries())[0];
    saveQueue.current.delete(blockId);
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllers.current.set(blockId, abortController);
    
    try {
      // Call onStart callback if provided
      options?.onStart?.();
      
      setSaving(true);
      const startTime = performance.now();
      lastSaveTimestamp.current = now;
      
      // Show a loading toast only if requested
      let toastId: string | number | undefined;
      if (options?.showToast !== false) {
        // Using toast.loading which returns string or number
        toastId = toast.loading("Saving changes...", {
          id: `save-${blockId}`,
          duration: 30000 // Long duration in case save takes time
        });
      }
      
      // Log save operation details for debugging
      console.log(`Starting save for block ${blockId} at ${new Date().toISOString()}`);
      
      // Perform the update with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timed out after 15 seconds')), 15000);
      });
      
      // Send the actual request with the abort signal
      const updatePromise = supabase
        .from('company_news_blocks')
        .update({
          ...data,
          updated_at: new Date().toISOString() // Force server to use new timestamp
        })
        .eq('id', blockId)
        .abortSignal(abortController.signal);
      
      // Race between the timeout and the update
      const { error } = await Promise.race([
        updatePromise,
        timeoutPromise
      ]) as any;
      
      if (error) throw error;
      
      // Calculate and log performance metrics
      const saveTime = performance.now() - startTime;
      console.log(`Save completed in ${saveTime.toFixed(2)}ms`);
      setLastSaveTime(saveTime);
      
      // Update toast status if it was shown
      if (toastId && options?.showToast !== false) {
        toast.success("Changes saved", {
          id: toastId,
          duration: 3000
        });
      }
      
      options?.onSuccess?.();
    } catch (error: any) { // Properly typed error parameter
      // Check if this was an abort error, which we can ignore
      if (error.name === 'AbortError') {
        console.log('Save operation was cancelled');
        if (options?.showToast !== false) {
          toast.error("Save cancelled", { duration: 3000 });
        }
        return;
      }
      
      // Properly log the error for debugging
      console.error('Error saving news block:', error);
      
      if (options?.showToast !== false) {
        toast.error("Failed to save changes", {
          description: error.message || "Please try again",
          duration: 5000
        });
      }
      
      // Create a proper Error object if it isn't already one
      const errorObject = error instanceof Error ? error : new Error(String(error));
      
      // Call onError callback with the proper error object
      if (options?.onError) {
        options.onError(errorObject);
      }
    } finally {
      setSaving(false);
      saveInProgress.current = false;
      abortControllers.current.delete(blockId);
      
      // Small delay before processing next item to prevent overwhelming the browser
      setTimeout(() => {
        processQueue();
      }, 300);
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
    if (options?.onStart) {
      options.onStart();
    }
    
    processQueue();
  }, [processQueue]);

  // Debounced save function with configurable delay
  const debouncedSave = useCallback((
    blockId: string, 
    data: Partial<any>, 
    delay: number = 1500, // Increased default debounce time
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
