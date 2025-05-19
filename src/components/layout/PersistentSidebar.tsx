
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
          width: isSidebarOpen ? '16rem' : (isMobile ? '0' : '4rem'),
          transform: isSidebarOpen || !isMobile ? 'translateX(0)' : 'translateX(-100%)',
          isolation: 'isolate',
        }}
      >
        <Sidebar isOpen={isSidebarOpen} />
      </div>
    </>
  );
};

export default PersistentSidebar;
