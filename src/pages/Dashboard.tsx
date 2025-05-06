
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import CaseList from '@/components/cases/CaseList';

const Dashboard = () => {
  const { cases, currentUser } = useAppContext();
  
  // Filter cases for the current user
  const userCases = currentUser?.role === 'consultant'
    ? cases
    : cases.filter(c => c.userId === currentUser?.id);
  
  // Calculate counts
  const newCases = userCases.filter(c => c.status === 'new').length;
  const ongoingCases = userCases.filter(c => c.status === 'ongoing').length;
  const resolvedCases = userCases.filter(c => c.status === 'resolved').length;
  const completedCases = userCases.filter(c => c.status === 'completed').length;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">New Cases</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{newCases}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Ongoing</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ongoingCases}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Awaiting Confirmation</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resolvedCases}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedCases}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <CaseList title="Recent Cases" showFilters={false} limit={6} />
      </div>
    </div>
  );
};

export default Dashboard;
