
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const SearchPage = () => {
  const { cases, users, companies, categories, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof cases>([]);
  const [isSearched, setIsSearched] = useState(false);
  
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.toLowerCase();
    let results = currentUser?.role === 'consultant'
      ? cases
      : cases.filter(c => c.userId === currentUser?.id);
    
    results = results.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
    setIsSearched(true);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Find Cases</h2>
        </CardHeader>
        <CardContent>
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
          <p className="text-xs text-muted-foreground mt-2">
            Search for cases by title, description, or keywords
          </p>
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
                
                const getStatusBadgeClass = () => {
                  switch (caseItem.status) {
                    case 'new': return 'status-new';
                    case 'ongoing': return 'status-ongoing';
                    case 'resolved': return 'status-resolved';
                    case 'completed': return 'status-completed';
                    default: return '';
                  }
                };
                
                const getPriorityBadgeClass = () => {
                  switch (caseItem.priority) {
                    case 'low': return 'priority-low';
                    case 'medium': return 'priority-medium';
                    case 'high': return 'priority-high';
                    default: return '';
                  }
                };
                
                return (
                  <Card 
                    key={caseItem.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{caseItem.title}</h3>
                        <Badge variant="outline" className={cn("status-badge", getStatusBadgeClass())}>
                          {caseItem.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{caseItem.description}</p>
                    </CardContent>
                    <CardFooter className="py-3 text-xs text-muted-foreground">
                      <div className="flex justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{user?.name}</span>
                          <span>•</span>
                          <span>{company?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("status-badge", getPriorityBadgeClass())}>
                            {caseItem.priority}
                          </Badge>
                          <span>
                            {formatDistanceToNow(new Date(caseItem.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
