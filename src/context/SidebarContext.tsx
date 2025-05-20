import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  sidebarWidth: number;
  isMobile: boolean;
}

const defaultContext: SidebarContextType = {
  isSidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
  sidebarWidth: 256, // 16rem default
  isMobile: false
};

const SidebarContext = createContext<SidebarContextType>(defaultContext);

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth] = useState(256); // Fixed width at 16rem
  const [isMobile, setIsMobile] = useState(false);
  // Keep track of whether the sidebar toggle was just clicked
  const toggleTimeoutRef = useRef<number | null>(null);

  // Check if we're on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      // On desktop, sidebar should always be considered "open"
      // but on mobile, we need to respect the current state
      if (!isMobileView) {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    // Only toggle if we're on mobile
    if (isMobile) {
      console.log("Toggling sidebar, current state:", isSidebarOpen);
      
      // Set a small delay to ensure the click event has fully propagated
      // before the state change, which will prevent race conditions
      if (toggleTimeoutRef.current) {
        window.clearTimeout(toggleTimeoutRef.current);
      }
      
      toggleTimeoutRef.current = window.setTimeout(() => {
        setIsSidebarOpen(prev => !prev);
      }, 10);
    }
  };
  
  const closeSidebar = () => {
    // Don't close if we just toggled
    if (isMobile && isSidebarOpen) {
      console.log("Closing sidebar");
      setIsSidebarOpen(false);
    }
  };

  return (
    <SidebarContext.Provider 
      value={{ 
        isSidebarOpen, 
        toggleSidebar,
        closeSidebar,
        sidebarWidth,
        isMobile 
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
