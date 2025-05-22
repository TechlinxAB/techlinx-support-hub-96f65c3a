
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Calendar, Trash2, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CasePriority, CaseStatus } from '@/context/AppContext';
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

const SearchPage = () => {
  const { cases, users, companies, categories, refetchCases } = useAppContext();
  const { profile, isImpersonating } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof cases>([]);
  const [isSearched, setIsSearched] = useState(false);
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [date, setDate] = React.useState<Date>();
  
  // Delete functionality
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleSearch = () => {
    setIsSearched(true);
    
    // Apply search logic - filter cases based on user role and impersonation
    let results = cases;
    
    // If user is not a consultant OR is impersonating a non-consultant user
    if (profile?.role !== 'consultant' || isImpersonating && profile?.role !== 'consultant') {
      results = cases.filter(c => c.userId === profile?.id);
    }
    
    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(c => c.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      results = results.filter(c => c.priority === priorityFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      results = results.filter(c => c.categoryId === categoryFilter);
    }
    
    // Apply company filter (consultants only)
    if (profile?.role === 'consultant' && !isImpersonating && companyFilter !== 'all') {
      results = results.filter(c => c.companyId === companyFilter);
    }
    
    // Apply date filter
    if (date) {
      const searchDate = new Date(date);
      results = results.filter(c => {
        const caseDate = new Date(c.createdAt);
        return (
          caseDate.getDate() === searchDate.getDate() &&
          caseDate.getMonth() === searchDate.getMonth() &&
          caseDate.getFullYear() === searchDate.getFullYear()
        );
      });
    }
    
    setSearchResults(results);
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
      
      // Update results by removing the deleted case
      setSearchResults(prevResults => 
        prevResults.filter(c => c.id !== caseToDelete)
      );

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
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Find Cases</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for case title, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm mb-1 block">Status</label>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as CaseStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="resolved">Awaiting Confirmation</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm mb-1 block">Priority</label>
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
              <label className="text-sm mb-1 block">Category</label>
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
            
            {profile?.role === 'consultant' && !isImpersonating && (
              <div>
                <label className="text-sm mb-1 block">Company</label>
                <Select 
                  value={companyFilter} 
                  onValueChange={setCompanyFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm mb-1 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isSearched && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">
            {searchResults.length} Results Found
          </h2>
          
          {searchResults.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">No cases found matching your search</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map(caseItem => {
                const user = users.find(u => u.id === caseItem.userId);
                const company = companies.find(c => c.id === caseItem.companyId);
                const category = categories.find(c => c.id === caseItem.categoryId);
                const canDelete = profile?.role === 'consultant';
                
                return (
                  <Card 
                    key={caseItem.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="py-3">
                      <div className="flex justify-between">
                        <div className="flex-1" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                          <h3 className="font-semibold">{caseItem.title}</h3>
                          {category && (
                            <p className="text-xs text-muted-foreground">{category.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              caseItem.status === 'new' ? 'new' :
                              caseItem.status === 'ongoing' ? 'ongoing' :
                              caseItem.status === 'resolved' ? 'awaiting' :
                              'completed'
                            }
                            onClick={() => navigate(`/cases/${caseItem.id}`)}
                          >
                            {caseItem.status === 'new' ? 'New' : 
                             caseItem.status === 'ongoing' ? 'Ongoing' : 
                             caseItem.status === 'resolved' ? 'Awaiting' : 
                             'Completed'}
                          </Badge>
                          
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteClick(e, caseItem.id)}
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                      <p className="text-sm text-muted-foreground line-clamp-2">{caseItem.description}</p>
                      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{user?.name}</span>
                          <span>•</span>
                          <span>{company?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "status-badge",
                              caseItem.priority === 'low' ? 'priority-low' :
                              caseItem.priority === 'medium' ? 'priority-medium' :
                              'priority-high'
                            )}
                          >
                            {caseItem.priority}
                          </Badge>
                          <span>
                            {formatDistanceToNow(new Date(caseItem.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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

export default SearchPage;
