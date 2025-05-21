import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search, Filter, Star, Trash2, CheckCircle, Clock, PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { useStarredCases } from '@/hooks/useStarredCases';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CasesPage = () => {
  const { loadingCases, cases, refetchCases } = useAppContext();
  const { profile, isImpersonating } = useAuth();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all' | 'watchlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { starredCases, toggleStar } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Track if initial data has been loaded
  useEffect(() => {
    if (!loadingCases && cases && !initialDataLoaded) {
      setInitialDataLoaded(true);
    }
  }, [loadingCases, cases, initialDataLoaded]);

  // Check if we're being directed to watchlist filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'watchlist') {
      setActiveTab('watchlist');
    }
  }, [location]);

  // Get watchlist count for badge
  const watchlistCount = cases ? cases.filter(c => starredCases.includes(c.id)).length : 0;
  
  // Navigate to case detail
  const viewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  // Handle star toggle with stopPropagation to prevent row click
  const handleStarToggle = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    toggleStar(caseId);
  };

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    setCaseToDelete(caseId);
    setIsDeleteDialogOpen(true);
  };

  // Handle case deletion
  const handleDeleteCase = async () => {
    if (!caseToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseToDelete);
      
      if (error) {
        throw error;
      }
      
      // Remove from starred cases if it was starred
      if (starredCases.includes(caseToDelete)) {
        toggleStar(caseToDelete);
      }

      await refetchCases();
      toast.success("Case deleted successfully");
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error("Failed to delete case");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  };

  // Display case list as a table component
  const CaseListTable = ({ statusFilter, watchlistFilter, searchQuery }: { 
    statusFilter?: CaseStatus | 'all', 
    watchlistFilter?: boolean,
    searchQuery: string 
  }) => {
    // Filter cases based on user role and impersonation state
    let filteredCases = cases || [];
    
    // If user role is not consultant OR if impersonating a user (not a consultant), only show user's cases
    if (profile?.role !== 'consultant' || (isImpersonating && profile?.role !== 'consultant')) {
      filteredCases = filteredCases.filter(c => c.userId === profile?.id);
    }
    
    // Apply additional filters
    filteredCases = filteredCases.filter(c => {
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
            <TableHead className="w-[100px]">Actions</TableHead>
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
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => handleStarToggle(e, caseItem.id)}
                  >
                    {starredCases.includes(caseItem.id) ? 
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : 
                      <Star className="h-4 w-4" />}
                  </Button>
                  {/* Only consultants can delete cases */}
                  {profile?.role === 'consultant' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, caseItem.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section with title, search and action buttons */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Cases</h1>

        {/* Search and filter buttons in a container */}
        <div className="flex w-full md:w-auto space-x-2 items-center">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search cases..."
              className="pl-9 pr-4 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-muted" : ""}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Link to="/cases/new">
            <Button className="whitespace-nowrap">New Case</Button>
          </Link>
        </div>
      </div>
      
      {/* Improved filter tabs with consistent styling */}
      <div className={`rounded-lg border shadow-sm p-4 bg-card transition-all duration-200 ${showFilters ? 'block' : 'hidden'}`}>
        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as CaseStatus | 'all' | 'watchlist')}>
          <TabsList className="grid w-full grid-cols-3 mb-2 lg:grid-cols-6">
            <TabsTrigger value="all" className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>All Cases</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center justify-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>New</span>
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Ongoing</span>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Awaiting</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Completed</span>
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center justify-center gap-2">
              <Star className="h-4 w-4" />
              <div className="flex items-center">
                <span>Watchlist</span>
                {watchlistCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1.5 h-[18px] min-w-[20px] px-1 py-0 flex items-center justify-center rounded-full text-xs font-medium translate-y-[-2px]"
                  >
                    {watchlistCount}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>
          
          {/* TabsContent components inside the Tabs component */}
          <TabsContent value="all">
            <CaseListTable statusFilter="all" searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="new">
            <CaseListTable statusFilter="new" searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="ongoing">
            <CaseListTable statusFilter="ongoing" searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="resolved">
            <CaseListTable statusFilter="resolved" searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="completed">
            <CaseListTable statusFilter="completed" searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="watchlist">
            <CaseListTable watchlistFilter={true} searchQuery={searchQuery} />
          </TabsContent>
        </Tabs>
      </div>
      
      {(loadingCases && !initialDataLoaded) ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Content when filters are not shown */}
          {activeTab === "all" && !showFilters && <CaseListTable statusFilter="all" searchQuery={searchQuery} />}
          {activeTab === "new" && !showFilters && <CaseListTable statusFilter="new" searchQuery={searchQuery} />}
          {activeTab === "ongoing" && !showFilters && <CaseListTable statusFilter="ongoing" searchQuery={searchQuery} />}
          {activeTab === "resolved" && !showFilters && <CaseListTable statusFilter="resolved" searchQuery={searchQuery} />}
          {activeTab === "completed" && !showFilters && <CaseListTable statusFilter="completed" searchQuery={searchQuery} />}
          {activeTab === "watchlist" && !showFilters && <CaseListTable watchlistFilter={true} searchQuery={searchQuery} />}
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCase}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CasesPage;
