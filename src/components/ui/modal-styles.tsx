
import { useEffect, useRef } from 'react';
import { useModal } from './modal-provider';

// Enhanced helper function for safer DOM manipulation with additional validation
const safeRemoveElement = (element: Element | null): boolean => {
  if (!element) return false;
  
  try {
    // Multiple safety checks before attempting removal
    if (!element.isConnected) return false;
    if (!element.parentNode) return false;
    
    // Check if parent still contains this child
    if (!element.parentNode.contains(element)) return false;
    
    // Verify parent reference is stable before removal
    const parent = element.parentNode;
    if (element.parentNode !== parent) return false;
    
    // Finally attempt removal with proper exception handling
    parent.removeChild(element);
    return true;
  } catch (error) {
    console.log('Safe element removal error (ignorable):', error);
  }
  return false;
};

export const ModalStyles = () => {
  const { isModalOpen, resetModalState } = useModal();
  const lastCheckTime = useRef(0);
  const elementRemovalQueue = useRef<Element[]>([]);
  const isProcessingQueue = useRef(false);
  
  // Process queued element removals in a controlled manner
  const processElementRemovalQueue = () => {
    if (isProcessingQueue.current || elementRemovalQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    
    try {
      // Take just one element and process it
      const element = elementRemovalQueue.current.shift();
      if (element) {
        safeRemoveElement(element);
      }
    } finally {
      isProcessingQueue.current = false;
      
      // Continue processing queue with a small delay if items remain
      if (elementRemovalQueue.current.length > 0) {
        setTimeout(processElementRemovalQueue, 50);
      }
    }
  };
  
  // Queue an element for safe removal
  const queueElementRemoval = (element: Element) => {
    if (!element) return;
    elementRemovalQueue.current.push(element);
    
    // Start processing if not already in progress
    if (!isProcessingQueue.current) {
      setTimeout(processElementRemovalQueue, 0);
    }
  };
  
  // Enhanced global UI recovery system with safer DOM cleanup
  useEffect(() => {
    // Recovery function that runs on a regular interval
    const recoverUI = () => {
      // Throttle checks to prevent excessive operations
      const now = Date.now();
      if (now - lastCheckTime.current < 200) {
        return; // Skip if checked too recently
      }
      lastCheckTime.current = now;
      
      // Check if body is in fixed position without a visible dialog
      const isBodyFixed = document.body.style.position === 'fixed';
      const hasVisibleDialogs = 
        document.querySelectorAll('[role="dialog"][data-state="open"]').length > 0 || 
        document.querySelectorAll('[data-radix-popover-content-wrapper]').length > 0;
      
      // Always ensure we don't have orphaned overlays
      const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
      const hasOrphanedOverlays = overlays.length > 0 && !isModalOpen;
      
      // Check for popover elements that might be stuck
      const popovers = document.querySelectorAll('[data-radix-popover-content-wrapper]');
      const hasStuckPopovers = popovers.length > 0 && !isModalOpen;
      
      // Check for any element with data-state="open" but no corresponding dialog
      const openStateElements = document.querySelectorAll('[data-state="open"]');
      const openPortals = document.querySelectorAll('[data-radix-portal]');
      
      if (isBodyFixed && !hasVisibleDialogs) {
        // No dialogs but body is locked - reset UI
        resetModalState();
        console.log('UI automatically recovered - body locked without dialogs');
      }
      
      if (hasOrphanedOverlays) {
        // Found overlay elements but no active modal - queue for safe cleanup
        overlays.forEach(overlay => {
          queueElementRemoval(overlay);
        });
        resetModalState();
      }
      
      if (hasStuckPopovers) {
        // Found popover elements but no active modal - queue for safe cleanup
        popovers.forEach(popover => {
          queueElementRemoval(popover);
        });
        resetModalState();
      }
      
      // Check for portals with no visible content
      if (openPortals.length > 0) {
        openPortals.forEach(portal => {
          // If portal has no visible children, queue for removal
          const hasVisibleChildren = portal.querySelector('[data-state="open"]');
          if (!hasVisibleChildren) {
            queueElementRemoval(portal);
          }
        });
      }
      
      // Fix pointer events if they got stuck
      const isPointerEventsNone = getComputedStyle(document.documentElement).pointerEvents === 'none';
      if (isPointerEventsNone && !isModalOpen) {
        document.documentElement.style.pointerEvents = '';
        console.log('Fixed pointer-events style');
      }
    };
    
    // Mutation observer to detect and correct DOM changes with improved error resilience
    const bodyObserver = new MutationObserver((mutations) => {
      // Use try-catch to ensure observer doesn't crash
      try {
        for (const mutation of mutations) {
          // If something has been added to the DOM that might be modal-related
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            Array.from(mutation.addedNodes).forEach(node => {
              if (node instanceof HTMLElement) {
                // For portals and overlays without associated modals
                if (node.hasAttribute('data-radix-portal') && !isModalOpen) {
                  setTimeout(recoverUI, 500); // Delayed check
                }
              }
            });
          }
          
          // Look for detached nodes that might cause reference errors
          if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
            setTimeout(recoverUI, 100); // Quick recovery check after DOM changes
          }
        }
      } catch (observerError) {
        console.log('Mutation observer error (ignorable):', observerError);
      }
    });
    
    // Watch body element for changes with error handling
    try {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    } catch (observerError) {
      console.log('Failed to initialize observer:', observerError);
    }
    
    // Run recovery checks on a timer
    const recoveryInterval = setInterval(recoverUI, 500);
    
    // Also run recovery on user interactions with debounce
    let interactionTimer: number | null = null;
    
    const handleUserInteraction = () => {
      if (interactionTimer !== null) {
        window.clearTimeout(interactionTimer);
      }
      interactionTimer = window.setTimeout(recoverUI, 100);
    };
    
    document.addEventListener('click', handleUserInteraction, true);
    document.addEventListener('keydown', handleUserInteraction, true);
    
    return () => {
      clearInterval(recoveryInterval);
      bodyObserver.disconnect();
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
      if (interactionTimer !== null) {
        window.clearTimeout(interactionTimer);
      }
    };
  }, [resetModalState, isModalOpen]);
  
  // Additional DOM safety system for modal closure
  useEffect(() => {
    // This function will run when modals close
    const cleanupAfterClose = () => {
      if (!isModalOpen) {
        // Short timeout to let animations complete
        setTimeout(() => {
          // Remove any "orphaned" overlay elements SAFELY
          document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
            queueElementRemoval(overlay);
          });
          
          // Find any elements with open state that should be closed
          document.querySelectorAll('[data-state="open"]').forEach(element => {
            // Only modify if not within an open dialog and is connected to DOM
            const parentDialog = element.closest('[role="dialog"]');
            if (!parentDialog && element.isConnected) {
              try {
                element.setAttribute('data-state', 'closed');
              } catch (error) {
                console.log('Error fixing element state:', error);
              }
            }
          });
          
          // Ensure body scroll is restored
          if (document.body.style.position === 'fixed') {
            resetModalState();
            console.log('Restored body scroll after modal closure');
          }
        }, 300);
      }
    };
    
    cleanupAfterClose();
  }, [isModalOpen, resetModalState]);

  // Enhanced focus trap safety system
  useEffect(() => {
    // Fix for any stuck focus traps
    const fixFocusTraps = () => {
      if (!isModalOpen) {
        // Check for any active focus trap elements
        const focusTrapElements = document.querySelectorAll('[data-radix-focus-guard]');
        if (focusTrapElements.length > 0) {
          focusTrapElements.forEach(element => {
            queueElementRemoval(element);
          });
        }
      }
    };

    const interval = setInterval(fixFocusTraps, 800);
    return () => clearInterval(interval);
  }, [isModalOpen]);
  
  // Enhanced emergency recovery functionality
  useEffect(() => {
    let escCount = 0;
    let escTimer: number | null = null;
    
    const handleTripleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        escCount++;
        
        if (escTimer === null) {
          escTimer = window.setTimeout(() => {
            escCount = 0;
            escTimer = null;
          }, 1500);
        }
        
        // Triple ESC activates emergency cleanup
        if (escCount >= 3) {
          setTimeout(() => {
            console.log('Triple ESC emergency cleanup activated');
            
            // Fix body state
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.overflow = '';
            document.documentElement.style.pointerEvents = '';
            
            // Queue all overlay elements for safe removal
            document.querySelectorAll('.fixed.inset-0').forEach(overlay => {
              queueElementRemoval(overlay);
            });
            
            // Queue all portal elements for safe removal
            document.querySelectorAll('[data-radix-portal]').forEach(portal => {
              queueElementRemoval(portal);
            });
            
            // Queue all popover elements for safe removal
            document.querySelectorAll('[data-radix-popover-content-wrapper]').forEach(popover => {
              queueElementRemoval(popover);
            });
            
            // Reset modal state
            resetModalState();
          }, 100);
          
          escCount = 0;
          if (escTimer !== null) {
            clearTimeout(escTimer);
            escTimer = null;
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleTripleEsc);
    return () => {
      document.removeEventListener('keydown', handleTripleEsc);
      if (escTimer !== null) {
        clearTimeout(escTimer);
      }
    };
  }, [resetModalState]);
  
  // New: Race condition protection with DOM tree reconnection check
  useEffect(() => {
    const preventDomReferenceLoss = () => {
      // Check for menu items that may lose their DOM connection
      document.querySelectorAll('[role="menuitem"]').forEach(item => {
        if (!item.isConnected) {
          console.log('Detected disconnected menu item - triggering reset');
          setTimeout(() => resetModalState(), 10);
        }
      });
      
      // Check for dialog elements that may have reference issues
      document.querySelectorAll('[role="dialog"]').forEach(dialog => {
        try {
          // Just accessing properties can sometimes reveal reference issues
          const isVisible = dialog.getAttribute('data-state') === 'open';
          const hasValidParent = dialog.parentElement !== null;
          
          if (!hasValidParent && isVisible) {
            console.log('Detected dialog with invalid parent - triggering reset');
            setTimeout(() => resetModalState(), 10);
          }
        } catch (e) {
          // If accessing properties throws, there's definitely a reference issue
          console.log('Dialog reference error detected - triggering reset');
          setTimeout(() => resetModalState(), 10);
        }
      });
    };
    
    const interval = setInterval(preventDomReferenceLoss, 1000);
    return () => clearInterval(interval);
  }, [resetModalState]);

  return null;
};

export default ModalStyles;
