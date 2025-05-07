
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import CaseList from '@/components/cases/CaseList';
import { ChartContainer } from '@/components/ui/chart';

const ConsultantDashboard = () => {
  const { cases, companies } = useAppContext();
  
  // Calculate counts
  const newCases = cases.filter(c => c.status === 'new').length;
  const ongoingCases = cases.filter(c => c.status === 'ongoing').length;
  const resolvedCases = cases.filter(c => c.status === 'resolved').length;
  const completedCases = cases.filter(c => c.status === 'completed').length;

  // Prepare data for charts
  const priorityData = [
    { name: 'Low', value: cases.filter(c => c.priority === 'low').length, color: '#10B981' },
    { name: 'Medium', value: cases.filter(c => c.priority === 'medium').length, color: '#F59E0B' },
    { name: 'High', value: cases.filter(c => c.priority === 'high').length, color: '#EF4444' },
  ];

  // Companies with most cases
  const companyCaseCounts = companies.map(company => {
    const count = cases.filter(c => c.companyId === company.id).length;
    return {
      name: company.name,
      cases: count
    };
  }).sort((a, b) => b.cases - a.cases).slice(0, 5);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Consultant Dashboard</h1>
      
      {/* Status Cards */}
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Priority Breakdown</h3>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Companies */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Top Companies by Cases</h3>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companyCaseCounts}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  {/* Explicitly providing all props instead of relying on defaultProps */}
                  <XAxis 
                    dataKey="name" 
                    scale="band"
                    padding={{ left: 10, right: 10 }}
                    tick={{ fontSize: 12 }}
                    height={60}
                    tickLine={true}
                    axisLine={true}
                    interval={0}
                    tickMargin={5}
                    minTickGap={0}
                    allowDecimals={false}
                  />
                  <YAxis
                    width={40}
                    tickLine={true}
                    axisLine={true}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    minTickGap={5}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                  <Bar dataKey="cases" fill="#387A3D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <CaseList title="Recent Cases" showFilters={false} limit={5} />
      </div>
    </div>
  );
};

export default ConsultantDashboard;
