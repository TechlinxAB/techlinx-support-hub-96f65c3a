
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Beaker, Layout, Newspaper, FileText, Users, Settings, Star } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TECHLINX_NAME } from '@/utils/techlinxTestCompany';

const TechlinxTestZone: React.FC = () => {
  const { companies } = useAppContext();
  const navigate = useNavigate();
  const [techlinxId, setTechlinxId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Find Techlinx company ID
  useEffect(() => {
    const techlinx = companies.find(company => company.name === TECHLINX_NAME);
    if (techlinx) {
      setTechlinxId(techlinx.id);
    }
  }, [companies]);

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
                onClick={() => navigate(`/company-dashboard-builder/${techlinxId}`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Layout className="h-6 w-6" />
                <span>Edit Dashboard</span>
              </Button>
              <Button
                onClick={() => navigate(`/company-dashboard`)}
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
                onClick={() => navigate(`/company-news-builder/${techlinxId}`)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Newspaper className="h-6 w-6" />
                <span>Edit News</span>
              </Button>
              <Button
                onClick={() => navigate(`/company-news/${techlinxId}`)}
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
                onClick={() => navigate(`/companies/${techlinxId}`)}
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
                onClick={() => navigate('/users')}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
              <Button
                onClick={() => navigate(`/company/${techlinxId}/settings`)}
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
                onClick={() => navigate(`/cases?filter=watchlist`)}
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
