
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { ModalProvider } from "./components/ui/modal-provider";
import ModalStyles from "./components/ui/modal-styles";
import ProtectedRoute from "./components/auth/ProtectedRoute";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <ModalProvider>
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
