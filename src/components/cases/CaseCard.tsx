
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
  
  const company = companies.find((c) => c.id === caseItem.companyId) as Company;
  const user = users.find((u) => u.id === caseItem.userId) as User;
  const category = categories.find((c) => c.id === caseItem.categoryId) as CaseCategory;
  const assignedTo = caseItem.assignedToId 
    ? users.find((u) => u.id === caseItem.assignedToId) 
    : undefined;
    
  const handleClick = () => {
    navigate(`/cases/${caseItem.id}`);
  };
  
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
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <h3 className="text-md font-semibold">{caseItem.title}</h3>
          <Badge variant="outline" className={cn("status-badge", getStatusBadgeClass())}>
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
            <span>{user.name}</span>
            <span>{company.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className={cn("status-badge", getPriorityBadgeClass())}>
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
