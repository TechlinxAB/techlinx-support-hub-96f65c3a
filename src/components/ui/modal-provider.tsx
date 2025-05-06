
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

  // Simple function to reset all modal state
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
    
    // Restore scroll position if we previously locked the body
    if (bodyWasLocked.current) {
      window.scrollTo(0, scrollPosition.current);
      bodyWasLocked.current = false;
    }
    
    console.log('Modal state reset');
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
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoading]);

  // Double ESC key press for emergency reset
  useEffect(() => {
    let lastEscTime = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime < 500) { // Double-press within 500ms
          resetModalState();
        }
        lastEscTime = now;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetModalState]);

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
