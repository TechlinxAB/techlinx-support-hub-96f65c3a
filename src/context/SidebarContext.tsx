
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarWidth: number;
  isMobile: boolean;
}

const defaultContext: SidebarContextType = {
  isSidebarOpen: true,
  toggleSidebar: () => {},
  sidebarWidth: 256, // 16rem default
  isMobile: false
};

const SidebarContext = createContext<SidebarContextType>(defaultContext);

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem default
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Load sidebar state from localStorage on component mount only
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarState');
    
    // First check if we're on mobile
    const isMobileView = window.innerWidth < 768;
    setIsMobile(isMobileView);
    
    if (savedSidebarState !== null) {
      // On mobile, default to closed regardless of saved state
      setIsSidebarOpen(isMobileView ? false : savedSidebarState === 'open');
    } else {
      // Default behavior based on screen size
      setIsSidebarOpen(!isMobileView);
    }
  }, []);

  // Update isMobile state when window is resized
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      // Close sidebar automatically when switching to mobile
      if (isMobileView && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Save sidebar state to localStorage when it changes
  // Only save desktop state, don't save mobile state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
    }
  }, [isSidebarOpen, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    // For debugging
    console.log("Toggling sidebar, new state:", !isSidebarOpen);
  };

  return (
    <SidebarContext.Provider 
      value={{ 
        isSidebarOpen, 
        toggleSidebar, 
        sidebarWidth,
        isMobile 
      }}
    >
      <div ref={sidebarRef} className="sidebar-container">
        {children}
      </div>
    </SidebarContext.Provider>
  );
};
