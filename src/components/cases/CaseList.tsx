
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
import CaseCard from './CaseCard';
import { Plus, Filter, RefreshCw } from 'lucide-react';

interface CaseListProps {
  title?: string;
  showFilters?: boolean;
  limit?: number;
}

const CaseList = ({ title = "All Cases", showFilters = true, limit }: CaseListProps) => {
  const navigate = useNavigate();
  const { cases, companies, categories, currentUser, loadingCases, refetchCases } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | 'all'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchCases();
    setRefreshing(false);
  };
  
  // Filter cases based on user role
  let filteredCases = currentUser?.role === 'consultant' 
    ? cases 
    : cases.filter(c => c.userId === currentUser?.id);
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredCases = filteredCases.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.description.toLowerCase().includes(query)
    );
  }
  
  // Apply status filter
  if (statusFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.status === statusFilter);
  }
  
  // Apply priority filter
  if (priorityFilter !== 'all') {
    filteredCases = filteredCases.filter(c => c.priority === priorityFilter);
  }
  
  // Sort by most recently updated
  filteredCases = [...filteredCases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  // Apply limit if specified
  if (limit) {
    filteredCases = filteredCases.slice(0, limit);
  }
  
  return (
    <div>
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
          <Button 
            size="sm" 
            onClick={() => navigate('/cases/new')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>
      
      {showFilters && showFilterMenu && (
        <div className="bg-muted/50 p-3 rounded-lg mb-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
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
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
        </div>
      )}
      
      {filteredCases.length === 0 ? (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No cases found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseList;
