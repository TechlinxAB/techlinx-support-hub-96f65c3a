
import { useEffect } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen, resetModalState } = useModal();
  
  // Global UI recovery system with more aggressive cleanup
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
        // Found overlay elements but no active modal - force cleanup
        overlays.forEach(overlay => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        });
        resetModalState();
        console.log('Orphaned overlay elements cleaned up');
      }
      
      if (hasStuckPopovers) {
        // Found popover elements but no active modal - force cleanup
        popovers.forEach(popover => {
          if (popover.parentNode) {
            popover.parentNode.removeChild(popover);
          }
        });
        resetModalState();
        console.log('Stuck popover elements cleaned up');
      }
      
      // Check for portals with no visible content
      if (openPortals.length > 0) {
        openPortals.forEach(portal => {
          // If portal has no visible children, remove it
          const hasVisibleChildren = portal.querySelector('[data-state="open"]');
          if (!hasVisibleChildren && portal.parentNode) {
            portal.parentNode.removeChild(portal);
            console.log('Empty portal element removed');
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
    
    // Check for "frozen" UI state where dialogs are gone but effects remain
    const checkFrozenState = () => {
      const isBodyLocked = document.body.style.position === 'fixed';
      const hasVisibleDialogs = document.querySelectorAll('[role="dialog"]').length > 0;
      
      if (isBodyLocked && !hasVisibleDialogs && !isModalOpen) {
        resetModalState();
        console.log('Fixed frozen UI state - body locked without dialogs');
      }
    };
    
    // Run this check less frequently
    const frozenStateInterval = setInterval(checkFrozenState, 2000);
    
    return () => {
      clearInterval(recoveryInterval);
      clearInterval(frozenStateInterval);
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
    };
  }, [resetModalState, isModalOpen]);
  
  // Additional cleanup system for modal component states
  useEffect(() => {
    // This function will run when modals close
    const cleanupAfterClose = () => {
      if (!isModalOpen) {
        // Short timeout to let animations complete
        setTimeout(() => {
          // Remove any "orphaned" overlay elements 
          document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80').forEach(overlay => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
              console.log('Cleaned up overlay after modal closure');
            }
          });
          
          // Find any elements with open state that should be closed
          document.querySelectorAll('[data-state="open"]').forEach(element => {
            // Only remove if not within an open dialog
            const parentDialog = element.closest('[role="dialog"]');
            if (!parentDialog && element.parentNode) {
              element.setAttribute('data-state', 'closed');
              console.log('Fixed element with incorrect open state');
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
    
    // Monitor for DOM changes that might indicate a modal/dialog has closed
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Look for removed nodes that might be dialogs
        if (mutation.removedNodes.length > 0) {
          Array.from(mutation.removedNodes).forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.getAttribute('role') === 'dialog' || 
                  node.querySelector('[role="dialog"]')) {
                setTimeout(cleanupAfterClose, 100);
              }
            }
          });
        }
        
        // Look for attribute changes that indicate state change
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-state' &&
            mutation.target instanceof HTMLElement) {
          if (mutation.target.getAttribute('data-state') === 'closed') {
            setTimeout(cleanupAfterClose, 100);
          }
        }
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    });
    
    return () => observer.disconnect();
  }, [isModalOpen, resetModalState]);

  return null;
};

export default ModalStyles;
