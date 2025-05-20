
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
  // Track the last time the sidebar was toggled
  const lastToggleTimeRef = useRef<number>(0);

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
      lastToggleTimeRef.current = Date.now();
      setIsSidebarOpen(prev => !prev);
    }
  };
  
  const closeSidebar = () => {
    // Don't close if we just toggled within the last 300ms
    const now = Date.now();
    if (isMobile && isSidebarOpen && (now - lastToggleTimeRef.current > 300)) {
      console.log("Closing sidebar");
      setIsSidebarOpen(false);
    } else {
      console.log("Ignoring close request - too soon after toggle", now - lastToggleTimeRef.current);
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
