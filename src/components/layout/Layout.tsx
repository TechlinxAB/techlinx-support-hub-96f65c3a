
import React, { useEffect, useState, memo } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Loader, RefreshCw } from 'lucide-react';
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

// Memoized Sidebar component to prevent unnecessary re-renders
const MemoizedSidebar = memo(Sidebar);

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { loading, session, isAuthenticated, authState } = useAuth();
  const [forceShow, setForceShow] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPauseRecovery, setIsPauseRecovery] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if bypass is active
  const bypassActive = isForceBypassActive();

  // Calculate sidebar margin based on screen size
  const [sidebarMargin, setSidebarMargin] = useState('16rem');

  // Update margin based on screen size and sidebar state
  useEffect(() => {
    const updateMargin = () => {
      if (window.innerWidth < 768) {
        setSidebarMargin(isSidebarOpen ? '16rem' : '0');
      } else {
        setSidebarMargin(isSidebarOpen ? '16rem' : '4rem');
      }
    };

    updateMargin();
    window.addEventListener('resize', updateMargin);
    return () => window.removeEventListener('resize', updateMargin);
  }, [isSidebarOpen]);

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

  // Emergency recovery helper - fixed to use React Router
  const handleAuthReset = async () => {
    setIsRecovering(true);
    try {
      await performFullAuthRecovery();
      // Use React Router navigate instead of window.location
      navigate(`/auth?reset=${Date.now()}`, { replace: true });
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
      <div className="flex items-center justify-center min-h-screen flex-col bg-sidebar">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="mb-4 text-white">Loading application...</p>
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
            className="text-white"
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
      <div className="flex items-center justify-center min-h-screen flex-col bg-sidebar">
        <p className="mb-4 text-red-500">Session not found. Please log in again.</p>
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => navigate(`/auth?force=${Date.now()}`, { replace: true })}
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

  return (
    <div className="layout-container">
      {/* Fixed position sidebar - completely outside the animation flow */}
      <div 
        className={`sidebar-persistent ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'}`}
      >
        <MemoizedSidebar isOpen={isSidebarOpen} />
      </div>
      
      {/* Main content area that adjusts based on sidebar state */}
      <div 
        className="main-content bg-white"
        style={{ marginLeft: sidebarMargin }}
      >
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
        <main className="p-4 bg-white flex-1 content-transition-wrapper">
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
