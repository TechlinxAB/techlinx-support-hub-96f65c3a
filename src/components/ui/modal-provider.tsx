
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

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollPosition = useRef(0);
  const bodyWasLocked = useRef(false);
  
  // Track modal open/close for debugging
  useEffect(() => {
    console.log(`Modal state: ${isModalOpen ? 'open' : 'closed'}`);
  }, [isModalOpen]);

  // Enhanced function to reset all modal state and force cleanup of DOM
  const resetModalState = useCallback(() => {
    setIsModalOpen(false);
    setIsLoading(false);
    
    // Clean up body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-modal-open');
    document.body.removeAttribute('data-loading');
    
    // Force remove any overlay elements that might be stuck
    const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
    overlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
        console.log('Forcefully removed overlay element during reset');
      }
    });
    
    // Force remove any dialog elements that might be stuck
    const dialogs = document.querySelectorAll('[role="dialog"]');
    dialogs.forEach(dialog => {
      // Check if the dialog has state="closed" but is still visible
      if (dialog.getAttribute('data-state') === 'closed') {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
          console.log('Forcefully removed closed dialog element');
        }
      }
    });
    
    // Force all popovers to close
    document.querySelectorAll('[data-radix-popover-content-wrapper]').forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
        console.log('Forcefully removed popover element');
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
      bodyWasLocked.current = false;
      
      // Force cleanup of any zombie overlays
      setTimeout(() => {
        const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
        if (overlays.length > 0 && !isModalOpen) {
          overlays.forEach(overlay => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
              console.log('Delayed cleanup of overlay element');
            }
          });
        }
      }, 300);
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
