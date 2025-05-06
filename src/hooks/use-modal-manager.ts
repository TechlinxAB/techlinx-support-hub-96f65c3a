
import { useEffect, useCallback } from 'react';

/**
 * A hook to manage modals and dialogs across the application
 * and provide emergency cleanup functionality
 */
export const useModalManager = () => {
  // Emergency cleanup function that removes orphaned overlays and portals
  const cleanupOrphanedModals = useCallback(() => {
    // Find and remove orphaned overlay elements
    const overlays = document.querySelectorAll('[data-state="open"]');
    overlays.forEach(overlay => {
      try {
        // Check if the overlay is actually visible but has no active dialog
        const computedStyle = window.getComputedStyle(overlay);
        if (computedStyle.display !== 'none' && !overlay.querySelector('[role="dialog"], [role="alertdialog"]')) {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }
      } catch (e) {
        console.error("Failed to clean up orphaned overlay:", e);
      }
    });

    // Remove any portals that don't have proper parent-child relationships
    const portals = document.querySelectorAll('[data-radix-portal]');
    portals.forEach(portal => {
      try {
        if (!portal.firstChild || portal.childNodes.length === 0) {
          if (portal.parentNode) {
            portal.parentNode.removeChild(portal);
          }
        }
      } catch (e) {
        console.error("Failed to clean up orphaned portal:", e);
      }
    });

    // Force body to be scrollable again if it was frozen
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    
    return true;
  }, []);

  // Setup triple-ESC emergency exit
  useEffect(() => {
    let escHits = 0;
    let escTimer: number | null = null;
    
    const handleEscapeEmergency = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        escHits++;
        
        // Reset after short delay
        if (escTimer) window.clearTimeout(escTimer);
        escTimer = window.setTimeout(() => {
          escHits = 0;
          escTimer = null;
        }, 600) as unknown as number;
        
        // If user pressed ESC three times quickly, trigger emergency cleanup
        if (escHits >= 3) {
          e.preventDefault();
          e.stopPropagation();
          cleanupOrphanedModals();
          escHits = 0;
          if (escTimer) window.clearTimeout(escTimer);
        }
      }
    };

    window.addEventListener("keydown", handleEscapeEmergency);
    
    // Create a mutation observer to detect when modals are added but not cleaned up
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check for radix portals being added without proper cleanup
          const portals = document.querySelectorAll('[data-radix-portal]');
          if (portals.length > 3) { // More than expected portals active
            console.warn("Too many portals detected, might need cleanup");
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Automatic cleanup interval for long-running sessions
    const cleanupInterval = window.setInterval(() => {
      // Only run if there are potential orphaned elements
      const portals = document.querySelectorAll('[data-radix-portal]');
      if (portals.length > 0) {
        cleanupOrphanedModals();
      }
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener("keydown", handleEscapeEmergency);
      if (escTimer) window.clearTimeout(escTimer);
      observer.disconnect();
      window.clearInterval(cleanupInterval);
    };
  }, [cleanupOrphanedModals]);

  return { cleanupOrphanedModals };
};

export default useModalManager;
