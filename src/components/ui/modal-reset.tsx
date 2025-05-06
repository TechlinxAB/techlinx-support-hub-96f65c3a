
import { useEffect } from "react";

/**
 * This component adds CSS to help recover from modal/popup issues
 * and ensures that the UI remains responsive
 */
const ModalReset = () => {
  useEffect(() => {
    // Create a style element to add emergency reset CSS
    const style = document.createElement("style");
    style.innerHTML = `
      /* Emergency reset for frozen UI */
      .dialog-removing {
        pointer-events: none !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease-out !important;
      }
      
      /* Ensure body never gets stuck */
      body:has([data-state="closed"]) {
        overflow: auto !important;
        pointer-events: auto !important;
      }
      
      /* Ensure portals get cleaned up properly */
      [data-radix-portal]:empty {
        display: none !important;
      }
      
      /* Force visibility for active dialogs */
      [data-state="open"] {
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      /* Safety override for dialogs */
      [role="dialog"],
      [role="alertdialog"] {
        isolation: isolate;
      }
      
      /* Extra portal cleanup - don't accumulate portals */
      body > [data-radix-portal] ~ [data-radix-portal] ~ [data-radix-portal] ~ [data-radix-portal] ~ [data-radix-portal]:empty {
        display: none !important;
      }
      
      /* Ensure dropdowns and modals don't stack improperly */
      [data-radix-popper-content-wrapper] {
        z-index: 51 !important;
      }
    `;
    document.head.appendChild(style);
    
    // Create a listener for emergency modal reset
    const handleTripleEsc = (() => {
      let escCount = 0;
      let escTimer: number | null = null;
      
      return (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          escCount++;
          
          // Reset after delay
          if (escTimer) window.clearTimeout(escTimer);
          escTimer = window.setTimeout(() => {
            escCount = 0;
          }, 800) as unknown as number;
          
          // Triple-ESC emergency cleanup
          if (escCount >= 3) {
            console.log("Emergency modal reset triggered");
            
            // Force cleanup all dialogs and portals
            document.querySelectorAll('[data-radix-portal]').forEach(el => {
              try {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              } catch (e) {
                console.error("Failed emergency portal cleanup:", e);
              }
            });
            
            // Reset body styles
            document.body.style.pointerEvents = 'auto';
            document.body.style.overflow = 'auto';
            
            escCount = 0;
            if (escTimer) window.clearTimeout(escTimer);
          }
        }
      };
    })();
    
    window.addEventListener('keydown', handleTripleEsc);
    
    return () => {
      document.head.removeChild(style);
      window.removeEventListener('keydown', handleTripleEsc);
    };
  }, []);

  // This is a utility component that doesn't render anything
  return null;
};

export default ModalReset;
