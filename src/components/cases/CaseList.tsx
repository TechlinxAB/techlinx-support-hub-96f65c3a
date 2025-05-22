
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Case, CaseStatus, CasePriority, useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, RefreshCw, Star, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStarredCases } from '@/hooks/useStarredCases';
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

interface CaseListProps {
  title?: string;
  showFilters?: boolean;
  limit?: number;
  statusFilter?: CaseStatus | 'all';
  searchQuery?: string;
  watchlistFilter?: boolean;
}

const CaseList = ({ 
  title = "All Cases", 
  showFilters = true, 
  limit, 
  statusFilter = 'all',
  searchQuery = '',
  watchlistFilter = false
}: CaseListProps) => {
  const navigate = useNavigate();
  const { cases, companies, categories, currentUser, loadingCases, refetchCases } = useAppContext();
  const { profile, isImpersonating } = useAuth();
  const { starredCases, toggleStar } = useStarredCases();
  
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchCases();
    setRefreshing(false);
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
  
  // Format the priority value to capitalize the first letter
  const formatPriority = (priority: CasePriority): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };
  
  // Filter cases based on user role and impersonation state
  let filteredCases = cases;
  
  // If user is not a consultant OR is impersonating a non-consultant user
  if (profile?.role !== 'consultant' || isImpersonating && profile?.role !== 'consultant') {
    filteredCases = cases.filter(c => c.userId === profile?.id);
  }
  
  // Apply search filter (either from props or local state)
  const effectiveSearchQuery = searchQuery || localSearchQuery;
  if (effectiveSearchQuery) {
    const query = effectiveSearchQuery.toLowerCase();
    filteredCases = filteredCases.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.description.toLowerCase().includes(query)
    );
  }
  
  // Apply watchlist filter
  if (watchlistFilter) {
    filteredCases = filteredCases.filter(c => starredCases.includes(c.id));
  }
  
  // Apply status filter
  if (statusFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.status === statusFilter);
  }
  
  // Apply priority filter
  if (priorityFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.priority === priorityFilter);
  }
  
  // Apply category filter
  if (categoryFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.categoryId === categoryFilter);
  }
  
  // Sort by most recently updated
  filteredCases = [...filteredCases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  // Apply limit if specified
  if (limit) {
    filteredCases = filteredCases.slice(0, limit);
  }

  // Update the getStatusBadgeClass function to use our new badge variants
  const getStatusBadgeClass = (status: CaseStatus) => {
    switch (status) {
      case 'new': return 'new';
      case 'ongoing': return 'ongoing';
      case 'resolved': return 'awaiting';
      case 'completed': return 'completed';
      default: return 'default';
    }
  };
  
  const getPriorityBadgeClass = (priority: CasePriority) => {
    switch (priority) {
      case 'low': return 'priority-low';
      case 'medium': return 'priority-medium';
      case 'high': return 'priority-high';
      default: return '';
    }
  };
  
  return (
    <div>
      {title && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="flex gap-2">
            {showFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}
      
      {showFilters && !searchQuery && (
        <div className="mb-4">
          <Input
            placeholder="Search cases..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="bg-background mb-2"
          />
        </div>
      )}
      
      {showFilters && showFilterMenu && (
        <div className="bg-muted/50 p-3 rounded-lg mb-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Select 
                value={priorityFilter} 
                onValueChange={(value) => setPriorityFilter(value as CasePriority | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      {filteredCases.length === 0 ? (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No cases found</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => {
                const user = profile?.role === 'consultant' && !isImpersonating
                  ? companies.find(c => c.id === caseItem.userId)?.name
                  : null;
                const company = companies.find(c => c.id === caseItem.companyId)?.name;
                const isStarred = starredCases.includes(caseItem.id);
                
                return (
                  <TableRow 
                    key={caseItem.id}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <TableCell 
                      className="font-medium"
                      onClick={() => navigate(`/cases/${caseItem.id}`)}
                    >
                      {caseItem.title}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/cases/${caseItem.id}`)}>
                      <Badge variant={getStatusBadgeClass(caseItem.status)}>
                        {caseItem.status === 'new' ? 'New' : 
                         caseItem.status === 'ongoing' ? 'Ongoing' : 
                         caseItem.status === 'resolved' ? 'Awaiting' : 
                         'Completed'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/cases/${caseItem.id}`)}>
                      <Badge variant="outline" className={cn("status-badge", getPriorityBadgeClass(caseItem.priority))}>
                        {formatPriority(caseItem.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/cases/${caseItem.id}`)}>{user || currentUser?.name}</TableCell>
                    <TableCell onClick={() => navigate(`/cases/${caseItem.id}`)}>{company}</TableCell>
                    <TableCell onClick={() => navigate(`/cases/${caseItem.id}`)}>{format(new Date(caseItem.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(caseItem.id);
                          }}
                        >
                          <Star className={`h-5 w-5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                        {/* Only consultants can delete cases */}
                        {profile?.role === 'consultant' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => handleDeleteClick(e, caseItem.id)}
                          >
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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

export default CaseList;
