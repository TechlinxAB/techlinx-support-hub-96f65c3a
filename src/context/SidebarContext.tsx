
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarWidth: number;
  isMobile: boolean;
}

const defaultContext: SidebarContextType = {
  isSidebarOpen: false, // Default to closed on mobile
  toggleSidebar: () => {},
  sidebarWidth: 256, // 16rem default
  isMobile: false
};

const SidebarContext = createContext<SidebarContextType>(defaultContext);

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // On desktop, sidebar is always shown
  // On mobile, isSidebarOpen controls visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem default
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Check if we're on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      // Set sidebar state based on view
      if (!isMobileView) {
        // On desktop, sidebar is always open
        setIsSidebarOpen(true);
      } else if (isMobileView && isSidebarOpen) {
        // When switching to mobile, close the sidebar
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    // Toggle sidebar visibility
    setIsSidebarOpen(prev => !prev);
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
