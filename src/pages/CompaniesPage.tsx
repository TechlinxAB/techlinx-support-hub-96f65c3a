
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, MessageCircle, Clock, FileText, HelpCircle, BellRing, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CompaniesPage = () => {
  const { companies, cases, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('announcements');
  
  // If user is not a consultant, redirect them to the company dashboard
  if (currentUser?.role !== 'consultant' && currentUser?.companyId) {
    navigate('/company-dashboard');
    return null;
  }
  
  // Show only companies for consultants
  const displayedCompanies = companies;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedCompanies.map(company => {
          // Find cases for this company
          const companyCases = cases.filter(c => c.companyId === company.id);
          const activeCases = companyCases.filter(c => c.status !== 'completed').length;
          
          return (
            <Card key={company.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <Building className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold">{company.name}</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Active Cases:</span>
                      <span>{activeCases}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Total Cases:</span>
                      <span>{companyCases.length}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                      Documentation
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => navigate(`/company-dashboard-builder/${company.id}`)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-1 items-center justify-center"
                      onClick={() => {
                        navigate('/cases');
                        // Here we would implement filtering by company
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Cases
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CompaniesPage;
