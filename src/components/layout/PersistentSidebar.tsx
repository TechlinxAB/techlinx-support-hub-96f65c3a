
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
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
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && 
          isSidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node)) {
        closeSidebar();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isSidebarOpen, closeSidebar]);
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      closeSidebar();
    }
  }, [location.pathname, isMobile, isSidebarOpen, closeSidebar]);
  
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
        className={`fixed top-0 left-0 h-full z-40 bg-sidebar transition-transform duration-300 ease-in-out shadow-md w-64`}
        style={{ 
          transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        <Sidebar />
      </div>
    </>
  );
};

export default PersistentSidebar;
