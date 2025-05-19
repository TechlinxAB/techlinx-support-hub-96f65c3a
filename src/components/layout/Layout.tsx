
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { loading, session } = useAuth();
  const [forceShow, setForceShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Set a timeout to force show content after 3 seconds
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 3000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Emergency navigation helper
  const handleForceNavigate = (path: string) => {
    window.location.href = path;
  };

  // Show a loading state until authentication is confirmed, but add a timeout
  if (loading && !forceShow) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="mb-4">Loading application...</p>
        <Button 
          variant="link" 
          onClick={() => setForceShow(true)}
          size="sm"
        >
          Click here if stuck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar isOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
