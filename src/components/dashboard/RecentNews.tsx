
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSettings } from '@/types/dashboardTypes';
import { RecentNewsItem } from '@/hooks/useRecentNews';

interface RecentNewsProps {
  recentNews: RecentNewsItem[];
  settings: DashboardSettings;
  companyId?: string;
}

const RecentNews = ({ recentNews, settings, companyId }: RecentNewsProps) => {
  // Check both old and new settings property names for backward compatibility
  if (!settings.showCompanyNotices && !settings.showRecentNews) {
    return null;
  }
  
  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  const handleViewAllNews = () => {
    if (companyId) {
      window.location.href = `/company-news/${companyId}`;
    }
  };
  
  return (
    <div id="recent-news" className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent News</h2>
        {companyId && recentNews.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleViewAllNews}>
            View All News
          </Button>
        )}
      </div>
      
      {recentNews.length > 0 ? (
        <div className="space-y-4">
          {recentNews.map(newsItem => (
            <Card key={newsItem.id}>
              <CardContent className="p-6">
                <p className="text-sm mb-4">{truncateContent(newsItem.content)}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Published {format(new Date(newsItem.created_at), 'MMMM d, yyyy')}
                  </p>
                  {companyId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleViewAllNews}
                    >
                      Read More
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-muted-foreground">No recent news available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecentNews;
