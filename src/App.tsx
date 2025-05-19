
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import useModalManager from "./hooks/use-modal-manager";
import ModalReset from "./components/ui/modal-reset";
import SearchPage from "./pages/SearchPage";
import { useEffect } from "react";
import { initPauseUnpauseDetection } from "./utils/authRecovery";

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
import CompanyNewsPage from "./pages/CompanyNewsPage";
import CompanyNewsBuilderPage from "./pages/CompanyNewsBuilderPage";
import UserManagementPage from "./pages/UserManagementPage";
import CompanyManagementPage from "./pages/CompanyManagementPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";

// Initialize the query client
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
  }, []);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <ModalManager>
            <Toaster />
            <ModalReset />
            <InitApp />
            <BrowserRouter>
              <Routes>
                {/* Public route - accessible without authentication */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Protected routes - require authentication */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="cases" element={<CasesPage />} />
                    <Route path="cases/new" element={<NewCasePage />} />
                    <Route path="cases/:id" element={<CaseDetailPage />} />
                    <Route path="companies" element={<CompaniesPage />} />
                    <Route path="companies/:id" element={<CompaniesPage />} />
                    <Route path="company/:id/settings" element={<CompanySettingsPage />} />
                    <Route path="company-dashboard" element={<CompanyDashboardPage />} />
                    <Route path="company-dashboard-builder/:companyId" element={<CompanyDashboardBuilderPage />} />
                    <Route path="company-news/:companyId" element={<CompanyNewsPage />} />
                    <Route path="company-news-builder/:companyId" element={<CompanyNewsBuilderPage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="company-management" element={<CompanyManagementPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </ModalManager>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
