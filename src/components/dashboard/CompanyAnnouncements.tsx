
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSettings } from '@/types/dashboardTypes';
import { CompanyAnnouncement } from '@/types/dashboardTypes';

interface CompanyAnnouncementsProps {
  announcements: CompanyAnnouncement[];
  settings: DashboardSettings;
}

const CompanyAnnouncements = ({ announcements, settings }: CompanyAnnouncementsProps) => {
  const navigate = useNavigate();
  
  if (!settings.showCompanyNotices) {
    return null;
  }
  
  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  return (
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
  );
};

export default CompanyAnnouncements;
