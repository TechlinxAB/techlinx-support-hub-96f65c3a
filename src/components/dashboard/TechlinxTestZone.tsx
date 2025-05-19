import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Beaker, Layout, Newspaper, FileText, Users, Settings, Star, RefreshCw } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TECHLINX_NAME, ensureTechlinxCompanyExists, clearTechlinxCache } from '@/utils/techlinxTestCompany';
import { toast } from 'sonner';

const TechlinxTestZone: React.FC = () => {
  const { companies, refetchCompanies } = useAppContext();
  const navigate = useNavigate();
  const [techlinxId, setTechlinxId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Find Techlinx company ID using either local state, context or API if needed
  useEffect(() => {
    // First try to find in the app context
    const techlinx = companies.find(company => company.name === TECHLINX_NAME);
    if (techlinx) {
      setTechlinxId(techlinx.id);
      setHasError(false);
      return;
    }
    
    // If not found in context, try to get from session storage
    const cachedCompany = sessionStorage.getItem('techlinx_company');
    if (cachedCompany) {
      try {
        const parsedCompany = JSON.parse(cachedCompany);
        setTechlinxId(parsedCompany.id);
        setHasError(false);
        return;
      } catch (e) {
        // Invalid JSON, continue to API call
      }
    }
    
    // If not in context or session storage, make API call (only once)
    const fetchTechlinx = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        const company = await ensureTechlinxCompanyExists();
        setTechlinxId(company.id);
        setHasError(false);
        refetchCompanies(); // Refresh companies list in context
      } catch (error) {
        console.error("Failed to ensure Techlinx exists:", error);
        setHasError(true);
        toast.error("Error Setting Up Test Zone", {
          description: "There was an error setting up the Techlinx test zone. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTechlinx();
  }, [companies, isLoading, refetchCompanies]);

  // Force direct URL navigation for dashboard builder
  const handleDashboardNavigation = (companyId: string) => {
    const path = `/company-dashboard-builder/${companyId}`;
    console.log(`Direct navigation to: ${path}`);
    // Show toast before navigating
    toast.info("Opening dashboard builder...");
    // Force direct URL navigation to avoid routing issues
    window.location.href = path;
    // Prevent event bubbling
    return false;
  };

  // Regular navigation for other links
  const handleNavigation = (path: string) => {
    try {
      console.log(`Navigating to: ${path}`);
      navigate(path, { replace: true });
    } catch (error) {
      console.error(`Navigation error to ${path}:`, error);
      window.location.href = path;
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    // Clear any cached data to ensure fresh fetch
    clearTechlinxCache();
    // Refetch companies to update the context
    await refetchCompanies();
    setHasError(false);
    setIsLoading(true);
    
    // Slight delay to allow UI to update
    setTimeout(() => {
      setIsLoading(false);
      setIsRetrying(false);
    }, 1000);
  };

  if (isLoading || isRetrying) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-500" />
            Techlinx Test Zone
          </CardTitle>
          <CardDescription>
            Setting up the test environment...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
          </div>
          <p className="text-center text-muted-foreground">
            {isRetrying ? "Retrying connection..." : "The Techlinx test company is being created. Please wait a moment."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="mb-6 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Techlinx Test Zone - Connection Error
          </CardTitle>
          <CardDescription>
            Unable to connect to the test environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              There was an error connecting to the Techlinx test environment. This could be due to:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Temporary network issues</li>
              <li>Database connection problems</li>
              <li>Service maintenance</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="mt-2"
                disabled={isRetrying}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
              
              <Button 
                onClick={() => {
                  clearTechlinxCache();
                  setHasError(false);
                  toast.info("Cache cleared");
                }}
                variant="outline"
                className="mt-2"
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!techlinxId) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-500" />
            Techlinx Test Zone
          </CardTitle>
          <CardDescription>
            Setting up the test environment...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The Techlinx test company is being created. Please refresh the page in a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-500" />
            <CardTitle>Techlinx Test Zone</CardTitle>
            <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-200">
              Sandbox
            </Badge>
          </div>
        </div>
        <CardDescription>
          A safe environment to test and experiment with features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Layout className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1">
              <Newspaper className="h-4 w-4" />
              <span>News</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Docs</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>Watchlist</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                onClick={() => handleDashboardNavigation(techlinxId)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Layout className="h-6 w-6" />
                <span>Edit Dashboard</span>
              </Button>
              <Button
                onClick={() => handleNavigation(`/company-dashboard`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Layout className="h-6 w-6" />
                <span>View Dashboard</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="news" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleNavigation(`/company-news-builder/${techlinxId}`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Newspaper className="h-6 w-6" />
                <span>Edit News</span>
              </Button>
              <Button
                onClick={() => handleNavigation(`/company-news/${techlinxId}`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Newspaper className="h-6 w-6" />
                <span>View News</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="docs" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={() => handleNavigation(`/companies/${techlinxId}`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <FileText className="h-6 w-6" />
                <span>View Documentation</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="users" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleNavigation('/users')}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
              <Button
                onClick={() => handleNavigation(`/company/${techlinxId}/settings`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Settings className="h-6 w-6" />
                <span>Company Settings</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="watchlist" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={() => handleNavigation(`/cases?filter=watchlist`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Star className="h-6 w-6" />
                <span>View Watchlist Cases</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TechlinxTestZone;
