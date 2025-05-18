
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/auth/ImpersonationBanner';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // If no user is found, redirect to auth page
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

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
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Show a loading state until we have confirmed authentication
  if (!user || !profile) {
    return null; // Return nothing while checking auth, the ProtectedRoute will handle showing the loader
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      <ImpersonationBanner />
    </div>
  );
};

export default Layout;
