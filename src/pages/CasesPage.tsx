
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search, Filter, Star, Trash2, FileText, Clock, CheckCircle, AlertTriangle, PlusCircle, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaseStatus, CasePriority } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { useStarredCases } from '@/hooks/useStarredCases';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = 'date-desc' | 'date-asc' | 'status-asc' | 'status-desc';

const CasesPage = () => {
  const { loadingCases, cases, refetchCases, users } = useAppContext();
  const { profile, isImpersonating } = useAuth();
  const [activeTab, setActiveTab] = useState<CaseStatus | 'all' | 'watchlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { starredCases, toggleStar } = useStarredCases();
  const location = useLocation();
  const navigate = useNavigate();
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  // Determine if user is consultant
  const isConsultant = profile?.role === 'consultant';

  // Check if we're being directed to watchlist filter - only run once on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter === 'watchlist') {
      setActiveTab('watchlist');
    }
  }, [location.search]);

  // Get watchlist count using useMemo to prevent recalculation
  const watchlistCount = useMemo(() => 
    cases ? cases.filter(c => starredCases.includes(c.id)).length : 0,
    [cases, starredCases]
  );
  
  // Navigate to case detail
  const viewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  // Format the priority value to capitalize the first letter
  const formatPriority = (priority: CasePriority): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
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

  // Get status order for sorting
  const getStatusOrder = (status: string): number => {
    switch (status) {
      case 'new': return 0;
      case 'ongoing': return 1;
      case 'resolved': return 2;
      case 'completed': return 3;
      default: return 4;
    }
  };

  // Memoized filtered and sorted cases to prevent unnecessary recalculations
  const processedCases = useMemo(() => {
    if (!cases) return [];

    // Filter cases based on user role and impersonation state
    let filteredCases = cases;
    
    // If user role is not consultant OR if impersonating a user (not a consultant), only show user's cases
    if (!isConsultant || (isImpersonating && !isConsultant)) {
      filteredCases = filteredCases.filter(c => c.userId === profile?.id);
    }
    
    // Apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredCases = filteredCases.filter(c => 
        c.title.toLowerCase().includes(query) || 
        c.description.toLowerCase().includes(query)
      );
    }

    // Sort cases based on selected sort option
    return [...filteredCases].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      const statusOrderA = getStatusOrder(a.status);
      const statusOrderB = getStatusOrder(b.status);
      
      switch(sortOption) {
        case 'date-desc':
          return dateB - dateA; // Most recent first
        case 'date-asc':
          return dateA - dateB; // Oldest first
        case 'status-asc':
          return statusOrderA - statusOrderB; // New → Completed
        case 'status-desc':
          return statusOrderB - statusOrderA; // Completed → New
        default:
          return dateB - dateA; // Default to most recent
      }
    });
  }, [cases, isConsultant, isImpersonating, profile?.id, searchQuery, sortOption]);

  // Filter cases based on active tab
  const tabFilteredCases = useMemo(() => {
    switch (activeTab) {
      case 'watchlist':
        return processedCases.filter(c => starredCases.includes(c.id));
      case 'all':
        return processedCases;
      default:
        return processedCases.filter(c => c.status === activeTab);
    }
  }, [processedCases, activeTab, starredCases]);

  // Display case list as a table component
  const CaseListTable = ({ cases: tableCases }: { cases: typeof processedCases }) => {
    if (tableCases.length === 0) {
      return <div className="text-center py-6 text-muted-foreground">No cases found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            {isConsultant && !isImpersonating && <TableHead>User</TableHead>}
            <TableHead>
              <div className="flex items-center cursor-pointer" 
                   onClick={() => setSortOption(sortOption === 'date-desc' ? 'date-asc' : 'date-desc')}>
                Date
                <ArrowUpDown size={16} className="ml-1" />
              </div>
            </TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableCases.map(caseItem => {
            const user = users.find(u => u.id === caseItem.userId);
            
            return (
              <TableRow 
                key={caseItem.id} 
                onClick={() => viewCase(caseItem.id)}
                className="cursor-pointer hover:bg-muted"
              >
                <TableCell className="font-medium">{caseItem.title}</TableCell>
                <TableCell>
                  <Badge variant={
                    caseItem.status === 'new' ? 'new' :
                    caseItem.status === 'ongoing' ? 'ongoing' :
                    caseItem.status === 'resolved' ? 'awaiting' :
                    'completed'
                  }>
                    {caseItem.status === 'new' ? 'New' :
                     caseItem.status === 'ongoing' ? 'Ongoing' :
                     caseItem.status === 'resolved' ? 'Awaiting' :
                     'Completed'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "status-badge",
                    caseItem.priority === 'low' ? 'priority-low' :
                    caseItem.priority === 'medium' ? 'priority-medium' :
                    'priority-high'
                  )}>
                    {formatPriority(caseItem.priority)}
                  </Badge>
                </TableCell>
                {isConsultant && !isImpersonating && (
                  <TableCell>
                    {user?.name || 'Unknown User'}
                  </TableCell>
                )}
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
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section with title, search, filter dropdown, and action buttons */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Cases</h1>

        {/* Search, dropdown filter, and new case button in a container */}
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
          
          {/* Replace Filter button with DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className={showFilters ? "bg-muted" : ""}>
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? "Hide Filter Tabs" : "Show Filter Tabs"}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => setSortOption('date-desc')}
                className={sortOption === 'date-desc' ? "bg-accent" : ""}
              >
                Date (Newest First)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortOption('date-asc')}
                className={sortOption === 'date-asc' ? "bg-accent" : ""}
              >
                Date (Oldest First)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortOption('status-asc')}
                className={sortOption === 'status-asc' ? "bg-accent" : ""}
              >
                Status (New → Completed)
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortOption('status-desc')}
                className={sortOption === 'status-desc' ? "bg-accent" : ""}
              >
                Status (Completed → New)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link to="/cases/new">
            <Button className="whitespace-nowrap">New Case</Button>
          </Link>
        </div>
      </div>
      
      {/* Show loading spinner only when actually loading */}
      {loadingCases ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Filter tabs with nicer styling */}
          {showFilters && (
            <div className="rounded-lg border shadow-sm p-4 bg-card transition-all duration-200">
              <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as CaseStatus | 'all' | 'watchlist')}>
                <TabsList className="grid w-full grid-cols-3 mb-2 lg:grid-cols-6">
                  <TabsTrigger value="all" className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>All Cases</span>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4" />
                    <span>New</span>
                  </TabsTrigger>
                  <TabsTrigger value="ongoing" className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>Ongoing</span>
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Awaiting</span> 
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    <span>Completed</span>
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="relative flex items-center gap-1.5">
                    <Star className="h-4 w-4" />
                    <span>Watchlist</span>
                    {watchlistCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full">
                        {watchlistCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                {/* TabsContent components inside the Tabs component */}
                <TabsContent value="all">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
                <TabsContent value="new">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
                <TabsContent value="ongoing">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
                <TabsContent value="resolved">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
                <TabsContent value="completed">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
                <TabsContent value="watchlist">
                  <CaseListTable cases={tabFilteredCases} />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {/* Show table when filters are hidden */}
          {!showFilters && <CaseListTable cases={tabFilteredCases} />}
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
