
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, BellRing, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface CompanyAnnouncement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface DashboardSettings {
  showWelcome: boolean;
  showSubtitle: boolean;
  showNewCaseButton: boolean;
  showCompanyNewsButton: boolean;
  showCompanyDashboardButton: boolean;
  showActiveCases: boolean;
  showCompanyNotices: boolean;
}

const defaultSettings: DashboardSettings = {
  showWelcome: true,
  showSubtitle: true,
  showNewCaseButton: true,
  showCompanyNewsButton: true,
  showCompanyDashboardButton: true,
  showActiveCases: true,
  showCompanyNotices: true,
};

const UserDashboard = () => {
  const { currentUser, cases } = useAppContext();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  // Get user's cases only
  const userCases = cases.filter(c => c.userId === currentUser?.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter(c => c.status !== 'completed')
    .slice(0, 3);
  
  // Fetch company announcements and settings
  useEffect(() => {
    if (!currentUser?.companyId) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch company settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_id', currentUser.companyId)
          .maybeSingle();
        
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error fetching company settings:', settingsError);
        }
        
        if (settingsData) {
          setSettings({
            showWelcome: settingsData.show_welcome,
            showSubtitle: settingsData.show_subtitle,
            showNewCaseButton: settingsData.show_new_case_button,
            showCompanyNewsButton: settingsData.show_company_news_button,
            showCompanyDashboardButton: settingsData.show_company_dashboard_button,
            showActiveCases: settingsData.show_active_cases,
            showCompanyNotices: settingsData.show_company_notices,
          });
        }
        
        // Fetch company announcements
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select('*')
          .eq('company_id', currentUser.companyId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (announcementsError) {
          console.error('Error fetching announcements:', announcementsError);
        } else {
          setAnnouncements(announcementsData || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser?.companyId]);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  return (
    <div className="space-y-6">
      {settings.showWelcome && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hi {currentUser?.name.split(' ')[0]}, how can we help you today?
          </h1>
          {settings.showSubtitle && (
            <p className="text-muted-foreground mt-1">
              Check company news, submit a case, or visit your company's IT resources.
            </p>
          )}
        </div>
      )}
      
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {settings.showNewCaseButton && (
          <Button 
            onClick={() => navigate('/cases/new')} 
            className="h-auto py-6 flex flex-col gap-2"
          >
            <Plus className="h-8 w-8" />
            <span>New Case</span>
          </Button>
        )}
        
        {settings.showCompanyNewsButton && (
          <Button 
            variant="outline" 
            className="h-auto py-6 flex flex-col gap-2"
            onClick={() => {
              // Scroll to announcements section
              const element = document.getElementById('company-notices');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <BellRing className="h-8 w-8" />
            <span>View Company News</span>
          </Button>
        )}
        
        {settings.showCompanyDashboardButton && (
          <Button 
            variant="outline" 
            className="h-auto py-6 flex flex-col gap-2"
            onClick={() => navigate('/company-dashboard')}
          >
            <BookOpen className="h-8 w-8" />
            <span>Visit Company Dashboard</span>
          </Button>
        )}
      </div>
      
      {/* Active Cases */}
      {settings.showActiveCases && userCases.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Active Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCases.map(caseItem => (
              <Card key={caseItem.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium line-clamp-2">{caseItem.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-muted-foreground">
                        {format(new Date(caseItem.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        caseItem.status === 'new' 
                          ? 'bg-blue-100 text-blue-800' 
                          : caseItem.status === 'ongoing' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {caseItem.status === 'new' 
                          ? 'New' 
                          : caseItem.status === 'ongoing' 
                          ? 'Ongoing' 
                          : caseItem.status === 'resolved' 
                          ? 'Awaiting Confirmation'
                          : 'Draft'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View Case
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Company Notices */}
      {settings.showCompanyNotices && (
        <div id="company-notices" className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold">Company Notices</h2>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map(announcement => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <CardTitle>{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Posted {format(new Date(announcement.created_at), 'MMMM d, yyyy')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p>{truncateContent(announcement.content)}</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/company-dashboard')}
                    >
                      Read More
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-muted-foreground">No announcements at the moment.</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/company-dashboard')}
                >
                  Visit Company Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
