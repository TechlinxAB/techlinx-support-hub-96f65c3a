
import { useEffect, useRef } from 'react';
import { useModal } from './modal-provider';

// Helper function for safer DOM manipulation
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

export const ModalStyles = () => {
  const { isModalOpen, resetModalState } = useModal();
  const lastCheckTime = useRef(0);
  
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
        // Found overlay elements but no active modal - force cleanup SAFELY
        overlays.forEach(overlay => {
          safeRemoveElement(overlay);
        });
        resetModalState();
      }
      
      if (hasStuckPopovers) {
        // Found popover elements but no active modal - force cleanup SAFELY
        popovers.forEach(popover => {
          safeRemoveElement(popover);
        });
        resetModalState();
      }
      
      // Check for portals with no visible content
      if (openPortals.length > 0) {
        openPortals.forEach(portal => {
          // If portal has no visible children, remove it SAFELY
          const hasVisibleChildren = portal.querySelector('[data-state="open"]');
          if (!hasVisibleChildren) {
            safeRemoveElement(portal);
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
    
    // Mutation observer to detect and correct DOM changes
    const bodyObserver = new MutationObserver((mutations) => {
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
      }
    });
    
    // Watch body element for changes
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    // Run recovery checks on a timer - more frequently
    const recoveryInterval = setInterval(recoverUI, 500);
    
    // Also run recovery on user interactions
    const handleUserInteraction = () => {
      setTimeout(recoverUI, 100);
    };
    
    document.addEventListener('click', handleUserInteraction, true);
    document.addEventListener('keydown', handleUserInteraction, true);
    
    return () => {
      clearInterval(recoveryInterval);
      bodyObserver.disconnect();
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
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
            safeRemoveElement(overlay);
          });
          
          // Find any elements with open state that should be closed
          document.querySelectorAll('[data-state="open"]').forEach(element => {
            // Only remove if not within an open dialog and is connected to DOM
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
            safeRemoveElement(element);
          });
        }
      }
    };

    const interval = setInterval(fixFocusTraps, 800);
    return () => clearInterval(interval);
  }, [isModalOpen]);
  
  // NEW: Add special emergency recovery button (invisible but available on triple-ESC)
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
          // Force aggressive cleanup
          setTimeout(() => {
            console.log('Triple ESC emergency cleanup activated');
            
            // Fix body state
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.overflow = '';
            document.documentElement.style.pointerEvents = '';
            
            // Remove all overlay elements
            document.querySelectorAll('.fixed.inset-0').forEach(overlay => {
              safeRemoveElement(overlay);
            });
            
            // Remove all portal elements
            document.querySelectorAll('[data-radix-portal]').forEach(portal => {
              safeRemoveElement(portal);
            });
            
            // Remove all popover elements
            document.querySelectorAll('[data-radix-popover-content-wrapper]').forEach(popover => {
              safeRemoveElement(popover);
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

  return null;
};

export default ModalStyles;
