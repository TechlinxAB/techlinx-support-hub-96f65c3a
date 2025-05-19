
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import { AnimatePresence } from "framer-motion";

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

// Animation wrapper for routes
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <Routes location={location} key={location.pathname}>
      {/* Public route - accessible without authentication */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Protected routes - require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <AnimatePresence mode="wait" initial={false}>
              <Dashboard key="dashboard" />
            </AnimatePresence>
          } />
          <Route path="cases" element={
            <AnimatePresence mode="wait" initial={false}>
              <CasesPage key="cases" />
            </AnimatePresence>
          } />
          <Route path="cases/new" element={
            <AnimatePresence mode="wait" initial={false}>
              <NewCasePage key="new-case" />
            </AnimatePresence>
          } />
          <Route path="cases/:id" element={
            <AnimatePresence mode="wait" initial={false}>
              <CaseDetailPage key="case-detail" />
            </AnimatePresence>
          } />
          <Route path="companies" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompaniesPage key="companies" />
            </AnimatePresence>
          } />
          <Route path="companies/:id" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompaniesPage key="companies-id" />
            </AnimatePresence>
          } />
          <Route path="company/:id/settings" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanySettingsPage key="company-settings" />
            </AnimatePresence>
          } />
          <Route path="company-dashboard" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanyDashboardPage key="company-dashboard" />
            </AnimatePresence>
          } />
          <Route path="company-dashboard-builder/:companyId" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanyDashboardBuilderPage key="company-dashboard-builder" />
            </AnimatePresence>
          } />
          <Route path="company-news/:companyId" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanyNewsPage key="company-news" />
            </AnimatePresence>
          } />
          <Route path="company-news-builder/:companyId" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanyNewsBuilderPage key="company-news-builder" />
            </AnimatePresence>
          } />
          <Route path="users" element={
            <AnimatePresence mode="wait" initial={false}>
              <UserManagementPage key="users" />
            </AnimatePresence>
          } />
          <Route path="company-management" element={
            <AnimatePresence mode="wait" initial={false}>
              <CompanyManagementPage key="company-management" />
            </AnimatePresence>
          } />
          <Route path="settings" element={
            <AnimatePresence mode="wait" initial={false}>
              <SettingsPage key="settings" />
            </AnimatePresence>
          } />
          <Route path="search" element={
            <AnimatePresence mode="wait" initial={false}>
              <SearchPage key="search" />
            </AnimatePresence>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <ModalManager>
              <Toaster />
              <ModalReset />
              <InitApp />
              <AnimatePresence mode="wait">
                <AnimatedRoutes />
              </AnimatePresence>
            </ModalManager>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
