
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

  // Check if mobile on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      const wasAlreadyMobile = isMobile;
      setIsMobile(isMobileView);
      
      // Auto-close sidebar when switching to mobile
      if (isMobileView && !wasAlreadyMobile) {
        setIsSidebarOpen(false);
      }
      
      // When switching from mobile to desktop, restore sidebar state from localStorage
      if (!isMobileView && wasAlreadyMobile) {
        const savedState = localStorage.getItem('sidebarState');
        setIsSidebarOpen(savedState === 'open' || savedState === null);
      }
    };

    // Initial check on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarState');
    
    // First check if we're on mobile
    const isMobileView = window.innerWidth < 768;
    setIsMobile(isMobileView);
    
    // Always hide sidebar on mobile by default
    if (isMobileView) {
      setIsSidebarOpen(false);
    } else if (savedSidebarState !== null) {
      // On desktop, respect saved state
      setIsSidebarOpen(savedSidebarState === 'open');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  // Only save desktop state, don't save mobile state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
    }
  }, [isSidebarOpen, isMobile]);

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
