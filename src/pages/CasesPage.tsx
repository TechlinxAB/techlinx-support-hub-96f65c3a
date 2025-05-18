
import React, { useState } from 'react';
import CaseList from '@/components/cases/CaseList';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus } from '@/context/AppContext';
import { Input } from '@/components/ui/input';

const CasesPage = () => {
  const { loadingCases } = useAppContext();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      
      <div className="flex w-full max-w-sm items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search cases..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as CaseStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Cases</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="resolved">Awaiting Confirmation</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="all" searchQuery={searchQuery} />
          )}
        </TabsContent>
        <TabsContent value="new" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="new" searchQuery={searchQuery} />
          )}
        </TabsContent>
        <TabsContent value="ongoing" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="ongoing" searchQuery={searchQuery} />
          )}
        </TabsContent>
        <TabsContent value="resolved" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="resolved" searchQuery={searchQuery} />
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList statusFilter="completed" searchQuery={searchQuery} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CasesPage;
