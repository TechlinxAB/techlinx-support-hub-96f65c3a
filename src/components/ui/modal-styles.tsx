
import { useEffect } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen, resetModalState } = useModal();
  
  // Global UI recovery system with safer DOM cleanup
  useEffect(() => {
    // Recovery function that runs on a regular interval
    const recoverUI = () => {
      // Check if body is in fixed position without a visible dialog
      const isBodyFixed = document.body.style.position === 'fixed';
      const hasVisibleDialogs = 
        document.querySelectorAll('[role="dialog"]').length > 0 || 
        document.querySelectorAll('[data-state="open"]').length > 0;
      
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
          try {
            // Only remove if it's actually in the DOM
            if (overlay.isConnected && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
              console.log('Orphaned overlay element safely removed');
            }
          } catch (error) {
            console.log('Error removing overlay:', error);
          }
        });
        resetModalState();
      }
      
      if (hasStuckPopovers) {
        // Found popover elements but no active modal - force cleanup SAFELY
        popovers.forEach(popover => {
          try {
            // Only remove if it's actually in the DOM
            if (popover.isConnected && popover.parentNode) {
              popover.parentNode.removeChild(popover);
              console.log('Stuck popover element safely removed');
            }
          } catch (error) {
            console.log('Error removing popover:', error);
          }
        });
        resetModalState();
      }
      
      // Check for portals with no visible content
      if (openPortals.length > 0) {
        openPortals.forEach(portal => {
          try {
            // If portal has no visible children, remove it SAFELY
            const hasVisibleChildren = portal.querySelector('[data-state="open"]');
            if (!hasVisibleChildren && portal.isConnected && portal.parentNode) {
              portal.parentNode.removeChild(portal);
              console.log('Empty portal element safely removed');
            }
          } catch (error) {
            console.log('Error removing portal:', error);
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
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
    };
  }, [resetModalState, isModalOpen]);
  
  // Additional DOM safety system
  useEffect(() => {
    // This function will run when modals close
    const cleanupAfterClose = () => {
      if (!isModalOpen) {
        // Short timeout to let animations complete
        setTimeout(() => {
          // Remove any "orphaned" overlay elements SAFELY
          document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
            try {
              if (overlay.isConnected && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                console.log('Cleaned up overlay after modal closure');
              }
            } catch (error) {
              console.log('Error removing overlay:', error);
            }
          });
          
          // Find any elements with open state that should be closed
          document.querySelectorAll('[data-state="open"]').forEach(element => {
            try {
              // Only remove if not within an open dialog and is connected to DOM
              const parentDialog = element.closest('[role="dialog"]');
              if (!parentDialog && element.isConnected) {
                element.setAttribute('data-state', 'closed');
                console.log('Fixed element with incorrect open state');
              }
            } catch (error) {
              console.log('Error fixing element state:', error);
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

  // Focus trap safety system
  useEffect(() => {
    // Fix for any stuck focus traps
    const fixFocusTraps = () => {
      if (!isModalOpen) {
        // Check for any active focus trap elements
        const focusTrapElements = document.querySelectorAll('[data-radix-focus-guard]');
        if (focusTrapElements.length > 0) {
          focusTrapElements.forEach(element => {
            try {
              if (element.isConnected && element.parentNode) {
                element.parentNode.removeChild(element);
                console.log('Removed orphaned focus trap');
              }
            } catch (error) {
              console.log('Error removing focus trap:', error);
            }
          });
        }
      }
    };

    const interval = setInterval(fixFocusTraps, 800);
    return () => clearInterval(interval);
  }, [isModalOpen]);

  return null;
};

export default ModalStyles;
