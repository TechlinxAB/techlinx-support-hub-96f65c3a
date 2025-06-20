
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
import { fbPixel } from '@/utils/facebookPixel';

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
  const location = useLocation();
  
  // Track page views when route changes
  useEffect(() => {
    fbPixel.trackPageView(document.title);
  }, [location.pathname]);
  
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

  return (
    <div className="min-h-screen bg-white w-full">
      {/* Fixed Header */}
      <div 
        className="fixed top-0 right-0 z-30 bg-white border-b border-gray-200"
        style={{ 
          backgroundColor: 'white',
          left: contentMarginLeft,
          transition: 'left 0.3s ease'
        }}
      >
        <Header />
      </div>

      {/* Main content area - simplified to prevent double scrollbars */}
      <div 
        className="transition-all duration-300 bg-white min-h-screen"
        style={{ 
          marginLeft: contentMarginLeft,
          backgroundColor: 'white',
          paddingTop: '4rem' // Add padding for fixed header
        }}
      >
        {/* Content area with AnimatePresence for page transitions */}
        <div className="bg-white w-full">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Container>
                <div className="py-6">
                  <Outlet />
                </div>
              </Container>
            </PageTransition>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Layout;
