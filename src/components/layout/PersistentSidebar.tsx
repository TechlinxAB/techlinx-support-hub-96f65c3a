
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import Sidebar from './Sidebar';
import { useSidebar } from '@/context/SidebarContext';

const PersistentSidebar: React.FC = () => {
  const { isSidebarOpen, isMobile } = useSidebar();
  const location = useLocation();
  
  return (
    <div 
      className="fixed top-0 left-0 h-full z-40 bg-sidebar transition-all duration-300 ease-in-out shadow-md"
      style={{ 
        width: isSidebarOpen ? '16rem' : (isMobile ? '0' : '4rem'),
        transform: isSidebarOpen || !isMobile ? 'translateX(0)' : 'translateX(-100%)',
        isolation: 'isolate', // Contain the background color
      }}
    >
      <Sidebar isOpen={isSidebarOpen} />
    </div>
  );
};

export default PersistentSidebar;
