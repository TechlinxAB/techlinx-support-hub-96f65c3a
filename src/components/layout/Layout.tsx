import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import { RefreshCw } from 'lucide-react';
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

// Create a separate LoadingOverlay component
const LoadingOverlay = ({ message }: { message?: string }) => (
  <div 
    className="fixed inset-0 flex items-center justify-center min-h-screen flex-col bg-white z-50" 
    style={{ backgroundColor: 'white' }}
  >
    <p className="mb-4 text-gray-700">{message || "Loading application..."}</p>
  </div>
);

const Layout = () => {
  const [forceShow, setForceShow] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const { loading, session, isAuthenticated, authState } = useAuth();
  const { sidebarWidth, isSidebarOpen, isMobile } = useSidebar();
  
  // Calculate content margin based on sidebar state
  // Mobile devices should have no margin for the sidebar
  // Desktop always has the full sidebar margin
  const contentMarginLeft = isMobile ? 0 : '16rem';
  
  // Check if bypass is active
  const bypassActive = isForceBypassActive();

  useEffect(() => {
    // Set a timeout to force show content after 5 seconds
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 5000);
    
    // Check if we're returning from a pause state
    if (wasPauseDetected()) {
      // Silently clear the pause detected flag without showing any notification
      clearPauseDetected();
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // Track page transitions
  useEffect(() => {
    // Add listener for navigation events
    const handlePageTransitionStart = () => {
      setPageTransitioning(true);
    };
    
    const handlePageTransitionEnd = () => {
      setTimeout(() => {
        setPageTransitioning(false);
      }, 300);
    };
    
    window.addEventListener('popstate', handlePageTransitionStart);
    window.addEventListener('beforeunload', handlePageTransitionStart);
    
    return () => {
      window.removeEventListener('popstate', handlePageTransitionStart);
      window.removeEventListener('beforeunload', handlePageTransitionStart);
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

  // If loading or initial session state, show a loading indicator with WHITE background
  if ((loading && !forceShow) || (authState === 'INITIAL_SESSION' && !forceShow)) {
    return <LoadingOverlay message="Loading application..." />;
  }

  // If no session and not authenticated, show an error state with WHITE background
  if (!session && !isAuthenticated && !loading && !bypassActive && !forceShow) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center min-h-screen flex-col bg-white z-50" 
        style={{ backgroundColor: 'white' }}
      >
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

  // No loading overlay during page transitions anymore
  const showTransitionOverlay = false;

  return (
    <div className="flex min-h-screen bg-white w-full" style={{ backgroundColor: 'white' }}>
      {/* Main content area that properly adjusts to sidebar width */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 bg-white"
        style={{ 
          marginLeft: contentMarginLeft,
          backgroundColor: 'white',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Header />
        
        {/* Content area with AnimatePresence for page transitions */}
        <main className="flex-1 bg-white overflow-x-hidden py-6 w-full" style={{ backgroundColor: 'white' }}>
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
