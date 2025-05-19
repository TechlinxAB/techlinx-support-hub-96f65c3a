
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import useModalManager from "./hooks/use-modal-manager";
import ModalReset from "./components/ui/modal-reset";
import { useEffect, useState } from "react";
import { initPauseUnpauseDetection } from "./utils/authRecovery";
import NavigationService from "./services/navigationService";
import "./App.css"; // Ensure CSS is imported

// Import the new AppRoutes component that will handle all routing
import AppRoutes from "./AppRoutes";

// Initialize the query client with improved settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  }
});

// Modal Manager Component
const ModalManager = ({ children }: { children: React.ReactNode }) => {
  useModalManager();
  return <>{children}</>;
};

// White Preloader Component
const WhitePreloader = () => (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

// Init App Component to set up pause/unpause detection
const InitApp = () => {
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Initialize pause/unpause detection at the app root level
    initPauseUnpauseDetection();
    
    // Add loading class to body initially
    document.body.classList.add('loading');
    document.body.style.backgroundColor = 'white';
    
    // Remove loading class after a delay to ensure white background during initial load
    const timer = setTimeout(() => {
      document.body.classList.remove('loading');
      setAppReady(true);
    }, 500);
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('loading');
    };
  }, []);
  
  return null;
};

// The main app with proper routing structure
const App = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Show white preloader for a short time on initial load
    if (isInitialLoad) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Show white preloader during initial load */}
        {isInitialLoad && <WhitePreloader />}
        
        {/* Main app container with explicit white background */}
        <div 
          className="bg-white w-full h-full" 
          style={{ 
            position: 'relative', 
            backgroundColor: 'white',
            minHeight: '100vh',
          }}
        >
          <AuthProvider>
            <AppProvider>
              <TooltipProvider>
                <ModalManager>
                  <Toaster />
                  <ModalReset />
                  <InitApp />
                  <div 
                    className="bg-white w-full h-full" 
                    style={{ 
                      backgroundColor: 'white',
                      minHeight: '100vh',
                      position: 'relative',
                      isolation: 'isolate',
                    }}
                  >
                    <AppRoutes />
                  </div>
                </ModalManager>
              </TooltipProvider>
            </AppProvider>
          </AuthProvider>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
