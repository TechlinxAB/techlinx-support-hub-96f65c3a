
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import useModalManager from "./hooks/use-modal-manager";
import ModalReset from "./components/ui/modal-reset";
import SearchPage from "./pages/SearchPage";

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
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

// Modal Manager Component to initialize the modal manager hook
const ModalManager = ({ children }: { children: React.ReactNode }) => {
  // Initialize the modal manager to enable global cleanup functionality
  useModalManager();
  return <>{children}</>;
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
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<Index />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Layout />}>
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
            </ModalManager>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
