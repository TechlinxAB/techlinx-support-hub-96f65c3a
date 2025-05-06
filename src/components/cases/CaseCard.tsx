
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Case, CaseCategory, Company, User, useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CaseCardProps {
  caseItem: Case;
}

const CaseCard = ({ caseItem }: CaseCardProps) => {
  const navigate = useNavigate();
  const { companies, users, categories } = useAppContext();
  
  const company = companies.find((c) => c.id === caseItem.companyId);
  const user = users.find((u) => u.id === caseItem.userId);
  const category = categories.find((c) => c.id === caseItem.categoryId);
  const assignedTo = caseItem.assignedToId 
    ? users.find((u) => u.id === caseItem.assignedToId) 
    : undefined;
    
  const handleClick = () => {
    navigate(`/cases/${caseItem.id}`);
  };
  
  const getStatusBadgeClass = () => {
    switch (caseItem.status) {
      case 'new': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default: return '';
    }
  };
  
  const getPriorityBadgeClass = () => {
    switch (caseItem.priority) {
      case 'low': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return '';
    }
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/10 hover:border-primary/30"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <h3 className="text-md font-semibold">{caseItem.title}</h3>
          <Badge className={cn(getStatusBadgeClass())}>
            {caseItem.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{caseItem.description}</p>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{user?.name || 'Unknown User'}</span>
            <span>{company?.name || 'Unknown Company'}</span>
          </div>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className={cn(getPriorityBadgeClass())}>
              {caseItem.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(caseItem.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CaseCard;
