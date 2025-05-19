
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
import PageTransition from "./components/layout/PageTransition";

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
    <Routes location={location}>
      {/* Public route - accessible without authentication */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Protected routes - require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          } />
          <Route path="cases" element={
            <PageTransition>
              <CasesPage />
            </PageTransition>
          } />
          <Route path="cases/new" element={
            <PageTransition>
              <NewCasePage />
            </PageTransition>
          } />
          <Route path="cases/:id" element={
            <PageTransition>
              <CaseDetailPage />
            </PageTransition>
          } />
          <Route path="companies" element={
            <PageTransition>
              <CompaniesPage />
            </PageTransition>
          } />
          <Route path="companies/:id" element={
            <PageTransition>
              <CompaniesPage />
            </PageTransition>
          } />
          <Route path="company/:id/settings" element={
            <PageTransition>
              <CompanySettingsPage />
            </PageTransition>
          } />
          <Route path="company-dashboard" element={
            <PageTransition>
              <CompanyDashboardPage />
            </PageTransition>
          } />
          <Route path="company-dashboard-builder/:companyId" element={
            <PageTransition>
              <CompanyDashboardBuilderPage />
            </PageTransition>
          } />
          <Route path="company-news/:companyId" element={
            <PageTransition>
              <CompanyNewsPage />
            </PageTransition>
          } />
          <Route path="company-news-builder/:companyId" element={
            <PageTransition>
              <CompanyNewsBuilderPage />
            </PageTransition>
          } />
          <Route path="users" element={
            <PageTransition>
              <UserManagementPage />
            </PageTransition>
          } />
          <Route path="company-management" element={
            <PageTransition>
              <CompanyManagementPage />
            </PageTransition>
          } />
          <Route path="settings" element={
            <PageTransition>
              <SettingsPage />
            </PageTransition>
          } />
          <Route path="search" element={
            <PageTransition>
              <SearchPage />
            </PageTransition>
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
