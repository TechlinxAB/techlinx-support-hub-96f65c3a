
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import useModalManager from "./hooks/use-modal-manager";
import ModalReset from "./components/ui/modal-reset";
import { useEffect } from "react";
import { initPauseUnpauseDetection } from "./utils/authRecovery";
import NavigationService from "./services/navigationService";

// Import the new AppRoutes component that will handle all routing
import AppRoutes from "./AppRoutes";
import "./App.css";

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

// Init App Component to set up pause/unpause detection
const InitApp = () => {
  useEffect(() => {
    // Initialize pause/unpause detection at the app root level
    initPauseUnpauseDetection();
    
    // Force the body background to white
    document.body.style.backgroundColor = '#ffffff';
    
    // Additional safety measure: set background color via class
    document.documentElement.classList.add('bg-white');
  }, []);
  
  return null;
};

// The main app with proper routing structure
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <div style={{ backgroundColor: '#ffffff' }} className="bg-white">
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <ModalManager>
                <Toaster />
                <ModalReset />
                <InitApp />
                <AppRoutes />
              </ModalManager>
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </div>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
