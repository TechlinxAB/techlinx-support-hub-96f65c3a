
import React from 'react';
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NavigationService from "./services/navigationService";

// Page components
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/SearchPage";

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
import CompanySettingsPage from "./pages/CompanySettingsPage";

// Layout components
import PersistentSidebar from "./components/layout/PersistentSidebar";
import Header from "./components/layout/Header";

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Configure the navigation service with the current navigate function
  React.useEffect(() => {
    NavigationService.setNavigateFunction(navigate);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-white">
      {/* Persistent Sidebar - COMPLETELY outside of animation context */}
      <PersistentSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <Routes location={location}>
          <Route path="/auth" element={<AuthPage />} />
          
          {/* All protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex flex-col h-full">
                {/* Header is always present */}
                <Header />
                
                {/* Content area with AnimatePresence */}
                <div className="flex-1 overflow-auto bg-white">
                  <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location}>
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
                    </Routes>
                  </AnimatePresence>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
};

export default AppRoutes;
