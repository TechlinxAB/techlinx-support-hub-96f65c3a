
import React, { useState, useEffect } from 'react';
import CaseList from '@/components/cases/CaseList';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { useStarredCases } from '@/hooks/useStarredCases';
import { Badge } from '@/components/ui/badge';

const CasesPage = () => {
  const { loadingCases, cases } = useAppContext();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all' | 'watchlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { starredCases } = useStarredCases();
  const location = useLocation();

  // Check if we're being directed to watchlist filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'watchlist') {
      setActiveTab('watchlist');
    }
  }, [location]);

  // Get watchlist count for badge
  const watchlistCount = cases.filter(c => starredCases.includes(c.id)).length;

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
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as CaseStatus | 'all' | 'watchlist')}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Cases</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="resolved">Awaiting Confirmation</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="watchlist" className="relative">
            <span className="flex items-center">
              <Star className="h-4 w-4 mr-1" />
              <span>Watchlist</span>
              {watchlistCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full">
                  {watchlistCount}
                </Badge>
              )}
            </span>
          </TabsTrigger>
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
        <TabsContent value="watchlist" className="mt-6">
          {loadingCases ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CaseList watchlistFilter={true} searchQuery={searchQuery} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CasesPage;
