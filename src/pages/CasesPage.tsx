import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { useStarredCases } from '@/hooks/useStarredCases';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CasesPage = () => {
  const { loadingCases, cases } = useAppContext();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all' | 'watchlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { starredCases, toggleStar } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();

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
  
  // Navigate to case detail
  const viewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  // Handle star toggle with stopPropagation to prevent row click
  const handleStarToggle = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    toggleStar(caseId);
  };

  // Display case list as a table component
  const CaseListTable = ({ statusFilter, watchlistFilter, searchQuery }: { 
    statusFilter?: CaseStatus | 'all', 
    watchlistFilter?: boolean,
    searchQuery: string 
  }) => {
    // Filter cases based on the provided filters
    const filteredCases = cases.filter(c => {
      // Text search filter
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      
      // Watchlist filter
      const matchesWatchlist = watchlistFilter ? starredCases.includes(c.id) : true;
      
      return matchesSearch && matchesStatus && matchesWatchlist;
    });

    if (filteredCases.length === 0) {
      return <div className="text-center py-6 text-muted-foreground">No cases found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCases.map(caseItem => (
            <TableRow 
              key={caseItem.id} 
              onClick={() => viewCase(caseItem.id)}
              className="cursor-pointer hover:bg-muted"
            >
              <TableCell className="font-medium">{caseItem.title}</TableCell>
              <TableCell>
                <Badge variant={
                  caseItem.status === 'new' ? 'default' :
                  caseItem.status === 'ongoing' ? 'secondary' :
                  caseItem.status === 'resolved' ? 'outline' :
                  'default'
                }>
                  {caseItem.status === 'new' ? 'New' :
                   caseItem.status === 'ongoing' ? 'Ongoing' :
                   caseItem.status === 'resolved' ? 'Awaiting Confirmation' :
                   'Completed'}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(caseItem.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleStarToggle(e, caseItem.id)}
                >
                  {starredCases.includes(caseItem.id) ? 
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                    <Star className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

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
        
        {loadingCases ? (
          <div className="flex items-center justify-center p-12">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="all" className="mt-6">
              <CaseListTable statusFilter="all" searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="new" className="mt-6">
              <CaseListTable statusFilter="new" searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="ongoing" className="mt-6">
              <CaseListTable statusFilter="ongoing" searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="resolved" className="mt-6">
              <CaseListTable statusFilter="resolved" searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <CaseListTable statusFilter="completed" searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="watchlist" className="mt-6">
              <CaseListTable watchlistFilter={true} searchQuery={searchQuery} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default CasesPage;
