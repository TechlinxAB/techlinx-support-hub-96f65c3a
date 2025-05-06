
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, MessageCircle, Clock, FileText, HelpCircle, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CompaniesPage = () => {
  const { companies, cases, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('announcements');
  
  // If user is not a consultant, show only their company
  const userCompany = companies.find(c => c.id === currentUser?.companyId);
  const displayedCompanies = currentUser?.role === 'consultant' 
    ? companies 
    : userCompany ? [userCompany] : [];
  
  // If user is not a consultant and we're on the companies page, show company details
  if (currentUser?.role !== 'consultant' && userCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{userCompany.name}</h1>
        </div>
        
        <Tabs defaultValue="announcements" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="announcements">
              <BellRing className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="faqs">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="announcements" className="mt-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium">Company Announcements</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No announcements at this time.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="faqs" className="mt-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium">Frequently Asked Questions</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No FAQs available at this time.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-2 items-center justify-center"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                      Documentation
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex gap-2 items-center justify-center"
                      onClick={() => {
                        navigate('/cases');
                        // Here we would implement filtering by company
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      View Cases
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
