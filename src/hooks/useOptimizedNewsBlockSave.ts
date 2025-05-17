
import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
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
  const MIN_SAVE_INTERVAL = 1500; // Minimum time between save operations
  const lastSaveTimestamp = useRef<number>(0);
  
  // Track active toast IDs to prevent duplicates
  const activeToastIds = useRef<Map<string, string | number>>(new Map());

  const cancelPendingSave = (blockId: string) => {
    if (pendingSaves.current.has(blockId)) {
      clearTimeout(pendingSaves.current.get(blockId));
      pendingSaves.current.delete(blockId);
      console.log(`Cancelled pending save for block ${blockId}`);
    }
    
    // Also cancel any in-flight requests for this block
    if (abortControllers.current.has(blockId)) {
      try {
        abortControllers.current.get(blockId)?.abort();
        abortControllers.current.delete(blockId);
        console.log(`Aborted in-flight save for block ${blockId}`);
      } catch (error) {
        console.error("Error aborting save:", error);
      }
    }
    
    // Remove from queue if present
    if (saveQueue.current.has(blockId)) {
      saveQueue.current.delete(blockId);
      console.log(`Removed block ${blockId} from save queue`);
    }

    // Clear any active toast for this block
    if (activeToastIds.current.has(blockId)) {
      const toastId = activeToastIds.current.get(blockId);
      if (toastId) {
        toast.dismiss(toastId);
        activeToastIds.current.delete(blockId);
      }
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
      }, MIN_SAVE_INTERVAL - timeSinceLastSave + 100); // Add small buffer
      return;
    }
    
    saveInProgress.current = true;
    const [blockId, { data, options }] = Array.from(saveQueue.current.entries())[0];
    saveQueue.current.delete(blockId);
    
    // Create abort controller for this request but don't use it to cancel automatically
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
        // If we already have a toast for this block, use that ID
        if (activeToastIds.current.has(blockId)) {
          toastId = activeToastIds.current.get(blockId);
          console.log(`Using existing toast ID for saving: ${toastId}`);
        } else {
          // Using toast which returns string or number
          toastId = toast({
            title: "Saving changes...",
            variant: "default"
          });
          
          if (toastId && toastId !== -1) { // Skip if toast is a duplicate (-1)
            activeToastIds.current.set(blockId, toastId);
          }
        }
      }
      
      // Log save operation details for debugging
      console.log(`Starting save for block ${blockId} at ${new Date().toISOString()}`);
      
      const timestamp = new Date().toISOString();

      // Add a smaller delay to ensure UI updates show the loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send the actual request with proper error handling
      // Do NOT pass the abort signal to prevent automatic cancellation
      const { error } = await supabase
        .from('company_news_blocks')
        .update({
          ...data,
          updated_at: timestamp // Force server to use new timestamp
        })
        .eq('id', blockId);
      
      if (error) throw error;
      
      // Calculate and log performance metrics
      const saveTime = performance.now() - startTime;
      console.log(`Save completed in ${saveTime.toFixed(2)}ms`);
      setLastSaveTime(saveTime);
      
      // Update toast status if it was shown
      if (toastId && toastId !== -1 && options?.showToast !== false) {
        // Clear previous toast first to avoid stacking
        toast.dismiss(toastId);
        
        // Show success toast
        toast({
          title: "News Block Updated",
          description: "The news block has been successfully updated",
          variant: "success"
        });
        
        // Remove this toast ID after a delay
        setTimeout(() => {
          activeToastIds.current.delete(blockId);
        }, 2000);
      }
      
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (error: any) {
      // Check if this was an abort error, which we can ignore
      if (error.name === 'AbortError' || (error.message && error.message.includes('aborted'))) {
        console.log('Save operation was cancelled');
        if (options?.showToast !== false) {
          // Clear any existing toast
          if (activeToastIds.current.has(blockId)) {
            toast.dismiss(activeToastIds.current.get(blockId));
          }
          
          toast({
            title: "Save cancelled",
            variant: "default"
          });
        }
        return;
      }
      
      // Properly log the error for debugging
      console.error('Error saving news block:', error);
      
      // Clear any existing toast for this block
      if (activeToastIds.current.has(blockId)) {
        const existingToastId = activeToastIds.current.get(blockId);
        if (existingToastId) {
          toast.dismiss(existingToastId);
        }
      }
      
      if (options?.showToast !== false) {
        toast({
          title: "Failed to save changes",
          description: error.message || "Please try again",
          variant: "destructive"
        });
      }
      
      // Create a proper Error object if it isn't already one
      const errorObject = error instanceof Error ? error : new Error(String(error));
      
      // Call onError callback with the proper error object
      if (options?.onError) {
        options.onError(errorObject);
      }
      
      // Clear any active toast IDs for this block
      activeToastIds.current.delete(blockId);
    } finally {
      setSaving(false);
      saveInProgress.current = false;
      abortControllers.current.delete(blockId);
      
      // Small delay before processing next item to prevent overwhelming the browser
      setTimeout(() => {
        processQueue();
      }, 500);
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
    
    // Process the queue
    processQueue();
  }, [processQueue]);

  // Debounced save function with configurable delay
  const debouncedSave = useCallback((
    blockId: string, 
    data: Partial<any>, 
    delay: number = 2500, // Reasonable default debounce time
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
