
import React from 'react';
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NavigationService from "./services/navigationService";
import { SidebarProvider } from './context/SidebarContext';

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
import Layout from "./components/layout/Layout";

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Configure the navigation service with the current navigate function
  React.useEffect(() => {
    NavigationService.setNavigateFunction(navigate);
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-white">
        {/* Persistent Sidebar - always outside of animation context */}
        <PersistentSidebar />

        {/* Main content wrapper */}
        <div className="w-full h-full flex-1 bg-white" style={{ 
          position: 'relative', 
          zIndex: 1,
        }}> 
          <Routes location={location}>
            {/* Auth route - doesn't use the main layout */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* All protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
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
          </Routes>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppRoutes;
