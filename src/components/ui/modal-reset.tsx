
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
      
      /* Emergency override for orphaned dialogs */
      [role="dialog"]:not(:focus-within):not(:hover),
      [role="alertdialog"]:not(:focus-within):not(:hover) {
        animation: dialog-fade-out 0.2s ease-in-out forwards;
      }
      
      @keyframes dialog-fade-out {
        to {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // This is a utility component that doesn't render anything
  return null;
};

export default ModalReset;
