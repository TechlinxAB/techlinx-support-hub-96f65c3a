
import React, { useState, useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Index from './pages/Index';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import NewCasePage from './pages/NewCasePage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDocumentationPage from './pages/CompanyDocumentationPage';
import CompanyDashboardPage from './pages/CompanyDashboardPage';
import CompanyDashboardBuilderPage from './pages/CompanyDashboardBuilderPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import CompanyManagementPage from './pages/CompanyManagementPage';
import NotFound from './pages/NotFound';
import { Toaster } from "@/components/ui/toaster"
import { useToast } from '@/components/ui/use-toast';
import CompanyNewsBuilderPage from './pages/CompanyNewsBuilderPage';

function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if running in a browser environment
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
    } else {
      // Optionally, handle server-side or non-browser environment
      toast({
        title: "Warning",
        description: "The app is running in a non-browser environment.",
        variant: "default",
      });
    }
  }, [toast]);

  // Prevent hydration error
  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/:caseId" element={<CaseDetailPage />} />
                <Route path="/new-case" element={<NewCasePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/companies/:companyId" element={<CompanyDocumentationPage />} />
                <Route path="/company-dashboard" element={<CompanyDashboardPage />} />
                <Route path="/company-dashboard-builder/:companyId" element={<CompanyDashboardBuilderPage />} />
                <Route path="/company-news-builder/:companyId" element={<CompanyNewsBuilderPage />} />
                <Route path="/company/:companyId/settings" element={<CompanySettingsPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/company-management" element={<CompanyManagementPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
