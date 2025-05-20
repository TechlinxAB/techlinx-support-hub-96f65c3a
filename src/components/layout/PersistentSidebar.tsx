
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PersistentSidebar: React.FC = () => {
  const { isSidebarOpen, closeSidebar, isMobile } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close sidebar on mobile
  useEffect(() => {
    // Only add the event listener when the sidebar is open on mobile
    if (isMobile && isSidebarOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        // Only close if click is outside sidebar and not on the toggle button
        const menuButton = document.querySelector('[aria-label="Toggle menu"]');
        const isMenuButtonClick = menuButton?.contains(event.target as Node);
        
        if (sidebarRef.current && 
            !sidebarRef.current.contains(event.target as Node) && 
            !isMenuButtonClick) {
          console.log('Close triggered by click outside');
          closeSidebar();
        }
      };
      
      // Use mouseup for better UX and to prevent race conditions
      document.addEventListener('mouseup', handleClickOutside);
      
      return () => {
        document.removeEventListener('mouseup', handleClickOutside);
      };
    }
  }, [isMobile, isSidebarOpen, closeSidebar]);
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      closeSidebar();
    }
  }, [location.pathname, isMobile, isSidebarOpen, closeSidebar]);
  
  // Only render if we're on desktop or if the sidebar is open on mobile
  if (!isMobile && !isSidebarOpen) {
    return null;
  }
  
  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
      
      <div 
        ref={sidebarRef}
        className="fixed top-0 left-0 h-full z-40 bg-sidebar transition-transform duration-300 ease-in-out shadow-md w-64"
        style={{ 
          transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          display: (isMobile || isSidebarOpen) ? 'block' : 'none'
        }}
      >
        <Sidebar />
      </div>
    </>
  );
};

export default PersistentSidebar;
