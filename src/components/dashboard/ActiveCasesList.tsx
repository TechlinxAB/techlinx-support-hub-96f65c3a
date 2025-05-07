
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSettings } from '@/types/dashboardTypes';
import { UserCaseItem } from '@/types/dashboardTypes';

interface ActiveCasesListProps {
  cases: UserCaseItem[];
  settings: DashboardSettings;
}

const ActiveCasesList = ({ cases, settings }: ActiveCasesListProps) => {
  const navigate = useNavigate();
  
  if (!settings.showActiveCases || cases.length === 0) {
    return null;
  }

  // Limit to 2 cases
  const limitedCases = cases.slice(0, 2);
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Active Cases</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {limitedCases.map(caseItem => (
          <Card 
            key={caseItem.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/cases/${caseItem.id}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium line-clamp-2">{caseItem.title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActiveCasesList;
