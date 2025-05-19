
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Loader, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { 
  performFullAuthRecovery, 
  wasPauseDetected, 
  clearPauseDetected, 
  isForceBypassActive, 
  setForceBypass 
} from '@/utils/authRecovery';
import PageTransition from '@/components/layout/PageTransition';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { loading, session, isAuthenticated, authState } = useAuth();
  const [forceShow, setForceShow] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPauseRecovery, setIsPauseRecovery] = useState(false);
  const location = useLocation();
  
  // Check if bypass is active
  const bypassActive = isForceBypassActive();

  useEffect(() => {
    // Load sidebar state from localStorage if available
    const savedSidebarState = localStorage.getItem('sidebarState');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'open');
    } else {
      // Default behavior based on screen size
      const handleResize = () => {
        if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
        } else {
          setIsSidebarOpen(true);
        }
      };
  
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    
    // Set a timeout to force show content after 3 seconds
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 5000); // 5s for reliability
    
    // Check if we're returning from a pause state
    if (wasPauseDetected()) {
      setIsPauseRecovery(true);
      toast.info("Recovering from app pause", {
        description: "Your session is being verified after returning from background",
        duration: 5000
      });
      
      // Clear the pause detected flag after showing the message
      setTimeout(() => {
        clearPauseDetected();
        setIsPauseRecovery(false);
      }, 5000);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Emergency recovery helper
  const handleAuthReset = async () => {
    setIsRecovering(true);
    try {
      await performFullAuthRecovery();
      // Navigate programmatically without full page reload
      window.location.href = `/auth?reset=${Date.now()}`;
    } catch (error) {
      console.error("Recovery failed:", error);
      setIsRecovering(false);
    }
  };
  
  // Handle force bypass activation
  const handleForceBypass = () => {
    setForceBypass();
    toast.success("Authentication bypass activated", {
      description: "You can now access the app regardless of auth status"
    });
    setForceShow(true);
  };

  // If loading or initial session state, show a loading indicator
  if ((loading && !forceShow) || (authState === 'INITIAL_SESSION' && !forceShow)) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="mb-4">Loading application...</p>
        {isPauseRecovery && (
          <p className="text-sm text-amber-500 mb-4">
            Recovering from app pause/background state...
          </p>
        )}
        <div className="flex gap-2">
          <Button 
            variant="link" 
            onClick={() => setForceShow(true)}
            size="sm"
          >
            Continue anyway
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAuthReset}
            size="sm"
            disabled={isRecovering}
          >
            {isRecovering ? (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reset auth
          </Button>
          <Button
            variant="link"
            onClick={handleForceBypass}
            className="text-sm text-amber-500"
            size="sm"
          >
            Bypass auth checks
          </Button>
        </div>
      </div>
    );
  }

  // If no session and not authenticated, but not loading, show an error state
  if (!session && !isAuthenticated && !loading && !bypassActive && !forceShow) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <p className="mb-4 text-red-500">Session not found. Please log in again.</p>
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => window.location.href = `/auth?force=${Date.now()}`}
          >
            Go to login
          </Button>
          <Button 
            variant="outline"
            onClick={() => setForceShow(true)}
          >
            Continue anyway
          </Button>
          <Button
            variant="outline"
            onClick={handleForceBypass}
            className="text-amber-500"
          >
            Bypass auth checks
          </Button>
        </div>
      </div>
    );
  }

  // If bypass is active, show a special layout with warning
  if (bypassActive) {
    return (
      <div className="flex h-screen overflow-hidden bg-muted/20">
        {/* Static sidebar that won't be affected by page transitions */}
        <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <Sidebar isOpen={isSidebarOpen} />
        </div>
        
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
          <Header toggleSidebar={toggleSidebar} />
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Authentication bypass active</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={handleAuthReset}
            >
              Reset Auth
            </Button>
          </div>
          <main className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Main layout with persistent sidebar and animated content
  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      {/* Mobile overlay */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Static sidebar that won't be affected by page transitions */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar isOpen={isSidebarOpen} />
      </div>
      
      {/* Main content area that adjusts based on sidebar state */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        <Header toggleSidebar={toggleSidebar} />
        
        {isPauseRecovery && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-amber-800 flex items-center justify-between">
            <span className="text-sm">Recovering from app pause...</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => clearPauseDetected()}
            >
              Dismiss
            </Button>
          </div>
        )}
        
        {/* Content area with AnimatePresence for page transitions */}
        <main className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
