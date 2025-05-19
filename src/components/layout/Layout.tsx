
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
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
import { useSidebar } from '@/context/SidebarContext';
import Container from '@/components/layout/Container';

const Layout = () => {
  const [forceShow, setForceShow] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPauseRecovery, setIsPauseRecovery] = useState(false);
  const { loading, session, isAuthenticated, authState } = useAuth();
  const { sidebarWidth, isSidebarOpen, isMobile } = useSidebar();
  
  // Calculate content margin based on sidebar state
  const contentMarginLeft = isMobile
    ? 0
    : (isSidebarOpen ? '16rem' : '4rem');
  
  // Check if bypass is active
  const bypassActive = isForceBypassActive();

  useEffect(() => {
    // Set a timeout to force show content after 5 seconds
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 5000);
    
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

  // Emergency recovery helper
  const handleAuthReset = async () => {
    setIsRecovering(true);
    try {
      await performFullAuthRecovery();
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
      <div className="flex items-center justify-center min-h-screen flex-col bg-white">
        <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="mb-4 text-gray-700">Loading application...</p>
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
            className="text-gray-700"
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
      <div className="flex items-center justify-center min-h-screen flex-col bg-white">
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

  return (
    <div className="flex min-h-screen bg-white w-full">
      {/* Main content area that properly adjusts to sidebar width */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 bg-white"
        style={{ marginLeft: contentMarginLeft }}
      >
        <Header />
        
        {isPauseRecovery && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 w-full">
            <Container>
              <div className="flex items-center justify-between w-full py-1">
                <span className="text-sm text-amber-800">Recovering from app pause...</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => clearPauseDetected()}
                >
                  Dismiss
                </Button>
              </div>
            </Container>
          </div>
        )}
        
        {/* Content area with AnimatePresence for page transitions */}
        <main className="flex-1 bg-white overflow-x-hidden py-6 w-full">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Container>
                <Outlet />
              </Container>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
