
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import Sidebar from './Sidebar';

const PersistentSidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    // Load sidebar state from localStorage on component mount only
    const savedSidebarState = localStorage.getItem('sidebarState');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'open');
    } else {
      // Default behavior based on screen size
      setIsSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
  }, [isSidebarOpen]);
  
  // Make the toggle function available globally
  window.toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };
  
  return (
    <div 
      className="fixed top-0 left-0 h-full z-50 bg-sidebar"
      style={{ 
        width: isSidebarOpen ? '16rem' : (window.innerWidth < 768 ? '0' : '4rem'),
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden'
      }}
    >
      <Sidebar isOpen={isSidebarOpen} />
    </div>
  );
};

export default PersistentSidebar;
