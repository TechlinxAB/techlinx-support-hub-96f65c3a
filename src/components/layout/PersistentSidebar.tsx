
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import Sidebar from './Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PersistentSidebar: React.FC = () => {
  const { isSidebarOpen, toggleSidebar, isMobile } = useSidebar();
  const location = useLocation();
  
  // Handle click outside to close sidebar on mobile
  const handleOverlayClick = () => {
    if (isMobile && isSidebarOpen) {
      toggleSidebar();
    }
  };
  
  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      
      <div 
        className="fixed top-0 left-0 h-full z-40 bg-sidebar transition-all duration-300 ease-in-out shadow-md"
        style={{ 
          // On desktop, sidebar is always full width
          // On mobile, sidebar is completely hidden unless open
          width: '16rem',
          transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          visibility: isMobile && !isSidebarOpen ? 'hidden' : 'visible',
          isolation: 'isolate',
        }}
      >
        <Sidebar isOpen={!isMobile || isSidebarOpen} />
      </div>
    </>
  );
};

export default PersistentSidebar;
