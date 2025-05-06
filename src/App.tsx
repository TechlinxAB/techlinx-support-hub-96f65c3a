
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { ModalProvider } from "./components/ui/modal-provider";
import ModalStyles from "./components/ui/modal-styles";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useEffect } from "react";

// Layouts
import Layout from "./components/layout/Layout";

// Pages
import Dashboard from "./pages/Dashboard";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import NewCasePage from "./pages/NewCasePage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyDashboardPage from "./pages/CompanyDashboardPage";
import CompanyDashboardBuilderPage from "./pages/CompanyDashboardBuilderPage";
import UserManagementPage from "./pages/UserManagementPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";

// Global UI recovery component
const UIRecovery = () => {
  useEffect(() => {
    // Global UI recovery system
    const recoverUI = () => {
      // Check for stale modal state
      if (document.body.style.position === 'fixed') {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length === 0) {
          // Reset UI to make it responsive
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          document.body.removeAttribute('data-modal-open');
          document.body.removeAttribute('data-loading');
          
          // Restore scroll position if needed
          const scrollY = document.body.style.top;
          if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
          }
          
          console.log('UI automatically recovered by global safety system');
        }
      }
    };
    
    // Run recovery on route changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          recoverUI();
        }
      }
    });
    
    // Track DOM changes that might indicate a navigation
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['data-state', 'class', 'style']
    });
    
    // Run recovery on clicks and key presses
    const handleUserInteraction = () => {
      setTimeout(recoverUI, 100);
    };
    
    document.addEventListener('click', handleUserInteraction, true);
    document.addEventListener('keydown', handleUserInteraction, true);
    
    // Safety interval
    const safetyInterval = setInterval(recoverUI, 5000);
    
    return () => {
      clearInterval(safetyInterval);
      observer.disconnect();
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
    };
  }, []);
  
  return null;
};

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <ModalProvider>
          <UIRecovery />
          <ModalStyles />
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="cases" element={<CasesPage />} />
                    <Route path="cases/new" element={<NewCasePage />} />
                    <Route path="cases/:id" element={<CaseDetailPage />} />
                    <Route path="companies" element={<CompaniesPage />} />
                    <Route path="companies/:id" element={<CompaniesPage />} />
                    <Route path="company-dashboard" element={<CompanyDashboardPage />} />
                    <Route path="company-dashboard-builder/:companyId" element={<CompanyDashboardBuilderPage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="company-management" element={<CompanyManagementPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ModalProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
