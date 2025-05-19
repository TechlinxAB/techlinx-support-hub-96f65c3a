
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
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'open');
    } else {
      // Default behavior based on screen size
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView);
    }
  }, []);

  // Update isMobile state when window is resized
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
  }, [isSidebarOpen]);

  // Use ResizeObserver to track sidebar width changes
  useEffect(() => {
    if (!sidebarRef.current) return;

    const updateSidebarWidth = () => {
      if (sidebarRef.current) {
        const width = sidebarRef.current.offsetWidth;
        setSidebarWidth(width);
      }
    };

    // Initial width measurement
    updateSidebarWidth();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(updateSidebarWidth);
    resizeObserver.observe(sidebarRef.current);

    return () => {
      if (sidebarRef.current) {
        resizeObserver.unobserve(sidebarRef.current);
      }
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Make the toggle function available globally for legacy code
  useEffect(() => {
    window.toggleSidebar = toggleSidebar;
  }, []);

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
