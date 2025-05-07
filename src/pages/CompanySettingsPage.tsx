
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSettings, CompanySettingsRow } from '@/types/dashboardTypes';

const defaultSettings: DashboardSettings = {
  showWelcome: true,
  showSubtitle: true,
  showNewCaseButton: true,
  showCompanyNewsButton: true,
  showCompanyDashboardButton: true,
  showActiveCases: true,
  showCompanyNotices: true,
};

const CompanySettingsPage = () => {
  const { id: companyId } = useParams();
  const { companies, currentUser } = useAppContext();
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const company = companies.find(c => c.id === companyId);
  
  // Check if user is a consultant
  if (currentUser?.role !== 'consultant') {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-lg text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchSettings = async () => {
      if (!companyId) return;
      
      setLoading(true);
      try {
        // Use type casting to bypass TypeScript limitations
        const { data, error } = await (supabase as any)
          .from('company_settings')
          .select('*')
          .eq('company_id', companyId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 means no rows returned
          throw error;
        }
        
        if (data) {
          const settingsRow = data as unknown as CompanySettingsRow;
          setSettings({
            showWelcome: settingsRow.show_welcome,
            showSubtitle: settingsRow.show_subtitle,
            showNewCaseButton: settingsRow.show_new_case_button,
            showCompanyNewsButton: settingsRow.show_company_news_button,
            showCompanyDashboardButton: settingsRow.show_company_dashboard_button,
            showActiveCases: settingsRow.show_active_cases,
            showCompanyNotices: settingsRow.show_company_notices,
          });
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
        toast({
          title: "Error",
          description: "Failed to load company settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [companyId]);

  const handleSaveSettings = async () => {
    if (!companyId) return;
    
    setIsSaving(true);
    try {
      // Use type casting to bypass TypeScript limitations
      const { data, error } = await (supabase as any)
        .from('company_settings')
        .upsert({
          company_id: companyId,
          show_welcome: settings.showWelcome,
          show_subtitle: settings.showSubtitle,
          show_new_case_button: settings.showNewCaseButton,
          show_company_news_button: settings.showCompanyNewsButton,
          show_company_dashboard_button: settings.showCompanyDashboardButton,
          show_active_cases: settings.showActiveCases,
          show_company_notices: settings.showCompanyNotices,
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Settings Saved",
        description: "Dashboard settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast({
        title: "Error",
        description: "Failed to save company settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSetting = (key: keyof DashboardSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Companies
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{company?.name || 'Company'} Settings</h1>
        </div>
        
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard Settings</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>User Dashboard Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Header Section</h3>
                  <Separator />
                  
                  <div className="grid gap-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="welcome">Welcome Message</Label>
                        <p className="text-sm text-muted-foreground">Show personalized greeting with user name</p>
                      </div>
                      <Switch
                        id="welcome"
                        checked={settings.showWelcome}
                        onCheckedChange={() => handleToggleSetting('showWelcome')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="subtitle">Subtitle</Label>
                        <p className="text-sm text-muted-foreground">Show instructional text below greeting</p>
                      </div>
                      <Switch
                        id="subtitle"
                        checked={settings.showSubtitle}
                        onCheckedChange={() => handleToggleSetting('showSubtitle')}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Quick Actions</h3>
                  <Separator />
                  
                  <div className="grid gap-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="newCase">New Case Button</Label>
                        <p className="text-sm text-muted-foreground">Allow users to create new support cases</p>
                      </div>
                      <Switch
                        id="newCase"
                        checked={settings.showNewCaseButton}
                        onCheckedChange={() => handleToggleSetting('showNewCaseButton')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="companyNews">Company News Button</Label>
                        <p className="text-sm text-muted-foreground">Allow users to view company announcements</p>
                      </div>
                      <Switch
                        id="companyNews"
                        checked={settings.showCompanyNewsButton}
                        onCheckedChange={() => handleToggleSetting('showCompanyNewsButton')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="companyDashboard">Company Dashboard Button</Label>
                        <p className="text-sm text-muted-foreground">Allow users to access company dashboard</p>
                      </div>
                      <Switch
                        id="companyDashboard"
                        checked={settings.showCompanyDashboardButton}
                        onCheckedChange={() => handleToggleSetting('showCompanyDashboardButton')}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Content Sections</h3>
                  <Separator />
                  
                  <div className="grid gap-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="activeCases">Active Cases</Label>
                        <p className="text-sm text-muted-foreground">Show user's active support cases</p>
                      </div>
                      <Switch
                        id="activeCases"
                        checked={settings.showActiveCases}
                        onCheckedChange={() => handleToggleSetting('showActiveCases')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="companyNotices">Company Notices</Label>
                        <p className="text-sm text-muted-foreground">Show company announcements feed</p>
                      </div>
                      <Switch
                        id="companyNotices"
                        checked={settings.showCompanyNotices}
                        onCheckedChange={() => handleToggleSetting('showCompanyNotices')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                General company settings will be available here in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanySettingsPage;
