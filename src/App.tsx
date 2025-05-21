
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

// Import the new AppRoutes component that will handle all routing
import AppRoutes from "./AppRoutes";

// Initialize the query client with improved settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
    // Hide console logs from react-query
    mutations: {
      onError: () => {
        // Errors will be handled by the components
      },
    }
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: (...args) => console.error(...args),
  }
});

// Modal Manager Component
const ModalManager = ({ children }: { children: React.ReactNode }) => {
  useModalManager();
  return <>{children}</>;
};

// Init App Component to set up pause/unpause detection
const InitApp = () => {
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    // Initialize pause/unpause detection at the app root level
    initPauseUnpauseDetection();
    
    // Add loading class to body initially
    document.body.classList.add('loading');
    
    // Remove loading class after a short delay to ensure white background during initial load
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
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <div className="bg-white w-full h-full" style={{ position: 'relative' }}>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <ModalManager>
                <Toaster />
                <ModalReset />
                <InitApp />
                <div className="bg-white w-full h-full"> {/* Extra white wrapper */}
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

export default App;
