
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext, Case } from '@/context/AppContext';
import { Star, AlertTriangle, Clock, CheckCircle, HelpCircle } from 'lucide-react';
import { useStarredCases } from '@/hooks/useStarredCases';

interface CaseCardProps {
  caseItem: Case;
}

const CaseCard = ({ caseItem }: CaseCardProps) => {
  const navigate = useNavigate();
  const { users, companies } = useAppContext();
  const { starredCases, toggleStar } = useStarredCases();
  
  // Find the user name
  const user = users.find(u => u.id === caseItem.userId);
  
  // Find the company name
  const company = companies.find(c => c.id === caseItem.companyId);
  
  // Status badge color
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-green-500">New</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500">Ongoing</Badge>;
      case 'resolved':
        return <Badge className="bg-yellow-500">Awaiting Confirmation</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-700">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertTriangle className="h-5 w-5 text-green-500" />;
      case 'ongoing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };
  
  // Format the date to a relative string (e.g., "2 days ago")
  const formattedDate = caseItem.updatedAt
    ? formatDistanceToNow(new Date(caseItem.updatedAt), { addSuffix: true })
    : '';
  
  // Check if this case is starred
  const isStarred = starredCases.includes(caseItem.id);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(caseItem.status)}
              {getBadgeVariant(caseItem.status)}
              {caseItem.priority === 'high' && (
                <Badge variant="destructive">High Priority</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{caseItem.title}</CardTitle>
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="line-clamp-2 text-muted-foreground">
          {caseItem.description}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {user?.name} • {company?.name} • {formattedDate}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/cases/${caseItem.id}`)}
        >
          View Case
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CaseCard;
