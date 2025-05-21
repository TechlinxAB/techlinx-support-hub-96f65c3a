
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSettings } from '@/types/dashboardTypes';
import { UserCaseItem } from '@/types/dashboardTypes';
import { Badge } from '@/components/ui/badge';

interface ActiveCasesListProps {
  cases: UserCaseItem[];
  settings: DashboardSettings;
}

const ActiveCasesList = ({ cases, settings }: ActiveCasesListProps) => {
  const navigate = useNavigate();
  
  if (!settings.showActiveCases || cases.length === 0) {
    return null;
  }

  const handleCaseClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Active Cases</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map(caseItem => (
          <Card 
            key={caseItem.id} 
            className="hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden border border-slate-200 hover:border-slate-300"
            onClick={() => handleCaseClick(caseItem.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium line-clamp-2">{caseItem.title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(caseItem.updatedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div>
                  <Badge variant={
                    caseItem.status === 'new' 
                      ? 'new' 
                      : caseItem.status === 'ongoing' 
                      ? 'ongoing' 
                      : caseItem.status === 'resolved' || caseItem.status === 'waiting'
                      ? 'awaiting'
                      : caseItem.status === 'completed'
                      ? 'completed'
                      : 'overdue'
                  }>
                    {caseItem.status === 'new' 
                      ? 'New' 
                      : caseItem.status === 'ongoing' 
                      ? 'Ongoing' 
                      : caseItem.status === 'resolved' || caseItem.status === 'waiting'
                      ? 'Awaiting'
                      : caseItem.status === 'completed'
                      ? 'Completed'
                      : 'Overdue'}
                  </Badge>
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
