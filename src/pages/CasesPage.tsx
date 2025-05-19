
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Loader, Search, Star, Trash2 } from 'lucide-react';
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
                  {/* Only consultants can delete cases or users can delete their own cases */}
                  {(profile?.role === 'consultant' || caseItem.userId === profile?.id) && (
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
