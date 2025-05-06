
import React, { useState } from 'react';
import CaseList from '@/components/cases/CaseList';
import { useAppContext } from '@/context/AppContext';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus } from '@/context/AppContext';

const CasesPage = () => {
  const { loadingCases } = useAppContext();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all'>('all');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Cases</h1>
        <Link to="/cases/new">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            New Case
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as CaseStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Cases</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="resolved">Awaiting Confirmation</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="all" />
          )}
        </TabsContent>
        <TabsContent value="new" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="new" />
          )}
        </TabsContent>
        <TabsContent value="ongoing" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="ongoing" />
          )}
        </TabsContent>
        <TabsContent value="resolved" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="resolved" />
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="completed" />
          )}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="draft" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CasesPage;
