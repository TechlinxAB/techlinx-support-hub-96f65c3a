
import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

// Define the context type
type ModalContextType = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  resetModalState: () => void;
};

// Create context with default values
const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  setIsModalOpen: () => {},
  isLoading: false,
  setIsLoading: () => {},
  resetModalState: () => {},
});

// Custom hook to use the modal context
export const useModal = () => useContext(ModalContext);

// Helper function for safely removing DOM elements
const safeRemoveElement = (element: Element): boolean => {
  try {
    if (element && element.isConnected && element.parentNode) {
      element.parentNode.removeChild(element);
      return true;
    }
  } catch (error) {
    console.log('Safe element removal error (ignorable):', error);
  }
  return false;
};

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollPosition = useRef(0);
  const bodyWasLocked = useRef(false);
  const lastResetTime = useRef(0);
  
  // Track modal open/close for debugging
  useEffect(() => {
    console.log(`Modal state: ${isModalOpen ? 'open' : 'closed'}`);
  }, [isModalOpen]);

  // Enhanced function to reset all modal state and force cleanup of DOM with improved safety
  const resetModalState = useCallback(() => {
    // Throttle reset calls to prevent excessive DOM manipulation
    const now = Date.now();
    if (now - lastResetTime.current < 150) {
      return; // Skip if called too frequently
    }
    lastResetTime.current = now;
    
    setIsModalOpen(false);
    setIsLoading(false);
    
    // Clean up body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-modal-open');
    document.body.removeAttribute('data-loading');
    
    // ENHANCED SAFETY: Use querySelectorAll with try-catch around each removal
    // Remove overlays with improved error handling
    document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
      safeRemoveElement(overlay);
    });
    
    // Remove closed dialogs with improved safety
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      try {
        if (dialog.getAttribute('data-state') === 'closed' && dialog.isConnected) {
          safeRemoveElement(dialog);
        }
      } catch (error) {
        console.log('Dialog cleanup error (ignorable):', error);
      }
    });
    
    // Close popovers with enhanced safety
    document.querySelectorAll('[data-radix-popover-content-wrapper]').forEach(element => {
      safeRemoveElement(element);
    });
    
    // Clean orphaned portals with safety checks
    document.querySelectorAll('[data-radix-portal]').forEach(portal => {
      try {
        // Only remove if truly empty
        const hasVisibleContent = portal.children.length > 0 && 
                                 !Array.from(portal.children).every(child => 
                                   child.getAttribute('data-state') === 'closed');
        
        if (!hasVisibleContent && portal.isConnected) {
          safeRemoveElement(portal);
        }
      } catch (error) {
        console.log('Portal cleanup error (ignorable):', error);
      }
    });
    
    // Remove focus trap elements with safety
    document.querySelectorAll('[data-radix-focus-guard]').forEach(element => {
      safeRemoveElement(element);
    });
    
    // Fix aria-hidden elements
    document.querySelectorAll('[aria-hidden="true"]').forEach(element => {
      if (element instanceof HTMLElement && 
          element.dataset.radixDialog !== 'true' && 
          element.dataset.radixSheet !== 'true') {
        try {
          element.removeAttribute('aria-hidden');
        } catch (error) {
          console.log('Aria attribute reset error (ignorable):', error);
        }
      }
    });
    
    // Restore scroll position if we previously locked the body
    if (bodyWasLocked.current) {
      window.scrollTo(0, scrollPosition.current);
      bodyWasLocked.current = false;
    }
    
    // Make sure click/touch events work again
    document.documentElement.style.pointerEvents = '';
    
    console.log('Modal state fully reset and DOM cleaned');
  }, []);

  // Handle body styles when modal state changes
  useEffect(() => {
    if (isModalOpen) {
      // Save the current scroll position before locking
      scrollPosition.current = window.scrollY;
      bodyWasLocked.current = true;
      
      // Apply fixed position to lock scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.current}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-modal-open', 'true');
    } else if (bodyWasLocked.current) {
      // Restore body styles and scroll position
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-modal-open');
      
      // Restore scroll position
      window.scrollTo(0, scrollPosition.current);
      
      // Enhanced safety: Use the safeRemoveElement helper for cleanup
      setTimeout(() => {
        if (!isModalOpen) {
          document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
            safeRemoveElement(overlay);
          });
        }
      }, 350);
    }
  }, [isModalOpen]);

  // Update data-loading attribute when loading state changes
  useEffect(() => {
    if (isLoading) {
      document.body.setAttribute('data-loading', 'true');
    } else {
      document.body.removeAttribute('data-loading');
    }
  }, [isLoading]);

  // Safety mechanism: If loading state persists too long, reset it
  useEffect(() => {
    if (isLoading) {
      const safetyTimeout = setTimeout(() => {
        setIsLoading(false);
        console.log('Loading state auto-reset after timeout');
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoading]);
  
  // NEW: Added orphaned elements observer 
  // This continuously watches for and cleans up any detached modal elements
  useEffect(() => {
    // Check for orphaned elements periodically
    const checkOrphanedElements = () => {
      if (!isModalOpen) {
        // Check for overlay elements with no modal
        document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
          const hasRelatedDialog = document.querySelectorAll('[role="dialog"][data-state="open"]').length > 0;
          if (!hasRelatedDialog) {
            safeRemoveElement(overlay);
          }
        });
        
        // Check for portal elements with closed content
        document.querySelectorAll('[data-radix-portal]').forEach(portal => {
          const hasOpenContent = Array.from(portal.querySelectorAll('[data-state]'))
            .some(el => el.getAttribute('data-state') === 'open');
            
          if (!hasOpenContent && portal.isConnected) {
            safeRemoveElement(portal);
          }
        });
        
        // Check if body is incorrectly locked
        if (document.body.style.position === 'fixed' && 
            !document.querySelector('[role="dialog"][data-state="open"]')) {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
        }
      }
    };
    
    const intervalId = setInterval(checkOrphanedElements, 1000);
    return () => clearInterval(intervalId);
  }, [isModalOpen]);
  
  // Safety cleanup for when component unmounts
  useEffect(() => {
    return () => {
      // Reset body styles on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-modal-open');
      document.body.removeAttribute('data-loading');
    };
  }, []);

  // Double ESC key press for emergency reset
  useEffect(() => {
    let lastEscTime = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime < 500) { // Double-press within 500ms
          resetModalState();
          console.log('Emergency modal reset triggered by double ESC');
        }
        lastEscTime = now;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetModalState]);
  
  // Forced cleanup after navigation events (hash changes, etc.)
  useEffect(() => {
    const cleanupAfterNavigation = () => {
      if (isModalOpen) {
        resetModalState();
        console.log('Modal state reset after navigation');
      }
    };
    
    window.addEventListener('hashchange', cleanupAfterNavigation);
    window.addEventListener('popstate', cleanupAfterNavigation);
    
    return () => {
      window.removeEventListener('hashchange', cleanupAfterNavigation);
      window.removeEventListener('popstate', cleanupAfterNavigation);
    };
  }, [isModalOpen, resetModalState]);
  
  // Emergency click handler to reset UI if it gets stuck
  useEffect(() => {
    let clickCount = 0;
    let clickTimer: number | null = null;
    
    const handleEmergencyReset = (e: MouseEvent) => {
      // Count rapid clicks (5 clicks within 2 seconds)
      clickCount++;
      
      if (clickTimer === null) {
        clickTimer = window.setTimeout(() => {
          clickCount = 0;
          clickTimer = null;
        }, 2000);
      }
      
      // If we detect 5+ rapid clicks and the UI seems stuck
      if (clickCount >= 5 && (isModalOpen || document.body.style.position === 'fixed')) {
        resetModalState();
        console.log('Emergency reset triggered by multiple rapid clicks');
        clickCount = 0;
        if (clickTimer !== null) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('click', handleEmergencyReset, true);
    return () => {
      document.removeEventListener('click', handleEmergencyReset, true);
      if (clickTimer !== null) {
        clearTimeout(clickTimer);
      }
    };
  }, [resetModalState, isModalOpen]);

  // Create context value
  const value = {
    isModalOpen,
    setIsModalOpen,
    isLoading,
    setIsLoading,
    resetModalState,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

// Custom hook that wraps operations in loading state
export const useLoadingOperation = () => {
  const { setIsLoading } = useModal();
  
  const withLoading = async <T extends any>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      return await operation();
    } finally {
      setIsLoading(false);
    }
  };
  
  return { withLoading };
};
