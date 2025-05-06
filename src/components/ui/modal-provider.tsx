
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

// Enhanced helper function for safely removing DOM elements with more robust error handling
const safeRemoveElement = (element: Element | null): boolean => {
  if (!element) return false;
  
  try {
    // Multiple safety checks
    if (!element.isConnected) return false;
    if (!element.parentNode) return false;
    
    // Store reference to parent before removal attempt
    const parent = element.parentNode;
    
    // Verify parent still contains child before removal
    if (!parent.contains(element)) return false;
    
    // Extra protection for race conditions
    if (element.parentNode !== parent) return false;
    
    // Finally attempt removal with exception handling
    parent.removeChild(element);
    return true;
  } catch (error) {
    console.log('Safe element removal error (ignorable):', error);
    return false;
  }
};

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollPosition = useRef(0);
  const bodyWasLocked = useRef(false);
  const lastResetTime = useRef(0);
  const pendingOperationsRef = useRef<Array<() => void>>([]);
  const cleanupInProgressRef = useRef(false);
  
  // Track modal open/close for debugging
  useEffect(() => {
    console.log(`Modal state: ${isModalOpen ? 'open' : 'closed'}`);
  }, [isModalOpen]);

  // Enhanced function to reset all modal state and force cleanup of DOM with improved safety
  const resetModalState = useCallback(() => {
    // Prevent recursive calls and throttle reset calls
    if (cleanupInProgressRef.current) return;
    
    const now = Date.now();
    if (now - lastResetTime.current < 150) {
      // Instead of skipping entirely, queue the operation
      pendingOperationsRef.current.push(() => resetModalState());
      return;
    }
    
    cleanupInProgressRef.current = true;
    lastResetTime.current = now;
    
    try {
      setIsModalOpen(false);
      setIsLoading(false);
      
      // Clean up body styles
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-modal-open');
      document.body.removeAttribute('data-loading');
      
      // Extra safety: Use querySelectorAll with robust error handling around each removal
      // Process elements in batches with slight delays to prevent DOM manipulation race conditions
      
      // 1. First handle overlays (most visible issue)
      setTimeout(() => {
        try {
          document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
            safeRemoveElement(overlay);
          });
          
          // 2. Then handle popovers that might be open but shouldn't be
          setTimeout(() => {
            try {
              document.querySelectorAll('[data-radix-popover-content-wrapper]').forEach(element => {
                safeRemoveElement(element);
              });
              
              // 3. Finally handle any other portal elements that might be orphaned
              setTimeout(() => {
                try {
                  document.querySelectorAll('[data-radix-portal]').forEach(portal => {
                    const hasVisibleContent = portal.children.length > 0 && 
                                            !Array.from(portal.children).every(child => 
                                              child.getAttribute('data-state') === 'closed');
                    
                    if (!hasVisibleContent) {
                      safeRemoveElement(portal);
                    }
                  });
                  
                  // 4. Clean orphaned focus trap elements
                  document.querySelectorAll('[data-radix-focus-guard]').forEach(element => {
                    safeRemoveElement(element);
                  });
                  
                  // 5. Fix aria-hidden elements
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
                  
                  // Process any pending operations that were queued during throttling
                  if (pendingOperationsRef.current.length > 0) {
                    const nextOperation = pendingOperationsRef.current.shift();
                    if (nextOperation) {
                      setTimeout(nextOperation, 50);
                    }
                  }
                } catch (portalError) {
                  console.log('Portal cleanup error (ignorable):', portalError);
                }
              }, 30);
            } catch (popoverError) {
              console.log('Popover cleanup error (ignorable):', popoverError);
            }
          }, 30);
        } catch (overlayError) {
          console.log('Overlay cleanup error (ignorable):', overlayError);
        } finally {
          // Restore scroll position if we previously locked the body
          if (bodyWasLocked.current) {
            window.scrollTo(0, scrollPosition.current);
            bodyWasLocked.current = false;
          }
          
          // Make sure click/touch events work again
          document.documentElement.style.pointerEvents = '';
          
          console.log('Modal state fully reset and DOM cleaned');
        }
      }, 10);
    } finally {
      cleanupInProgressRef.current = false;
    }
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
      
      // Enhanced safety: Use the safeRemoveElement helper for cleanup with delay
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
  
  // Enhanced orphaned elements observer with mutation tracking
  // This continuously watches for and cleans up any detached modal elements
  useEffect(() => {
    // New MutationObserver to catch DOM changes that might cause issues
    const domObserver = new MutationObserver((mutations) => {
      // Look for removed nodes that might cause reference errors
      let needsReset = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // If nodes are removed, check if any modals/popovers are affected
          if (mutation.removedNodes.length > 0) {
            for (const node of mutation.removedNodes) {
              if (node instanceof HTMLElement) {
                if (node.getAttribute('role') === 'dialog' || 
                    node.hasAttribute('data-radix-popover-content')) {
                  needsReset = true;
                  break;
                }
              }
            }
          }
          
          // If we see a portal added but no active modal, this could indicate an issue
          if (!isModalOpen && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLElement && 
                  (node.hasAttribute('data-radix-portal') || 
                   node.classList.contains('fixed') && node.classList.contains('inset-0'))) {
                needsReset = true;
                break;
              }
            }
          }
        }
      }
      
      // If we detected something that needs cleanup, schedule a reset
      if (needsReset) {
        setTimeout(() => {
          resetModalState();
        }, 100);
      }
    });
    
    // Start observing with a deep config
    domObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-hidden']
    });
    
    // Check for orphaned elements periodically
    const checkOrphanedElements = () => {
      if (!isModalOpen) {
        // Check for overlay elements with no modal
        document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
          const hasRelatedDialog = document.querySelectorAll('[role="dialog"][data-state="open"]').length > 0;
          if (!hasRelatedDialog && overlay.isConnected) {
            safeRemoveElement(overlay);
          }
        });
        
        // Check for portal elements with closed content
        document.querySelectorAll('[data-radix-portal]').forEach(portal => {
          if (!portal.isConnected) return;
          
          const hasOpenContent = Array.from(portal.querySelectorAll('[data-state]'))
            .some(el => el.getAttribute('data-state') === 'open');
            
          if (!hasOpenContent) {
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
    
    return () => {
      domObserver.disconnect();
      clearInterval(intervalId);
      
      // Reset body styles on unmount for safety
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-modal-open');
      document.body.removeAttribute('data-loading');
    };
  }, [isModalOpen, resetModalState]);
  
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

  // Emergency click handler for UI rescue
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
