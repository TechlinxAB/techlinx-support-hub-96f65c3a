
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} />
        <div className="flex flex-col flex-1">
          <Header toggleSidebar={toggleSidebar} />
          <main 
            className="flex-1 p-4 md:p-6 pt-5 transition-all duration-300 md:ml-64"
            onClick={() => {
              if (isMobile && sidebarOpen) {
                setSidebarOpen(false);
              }
            }}
          >
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
