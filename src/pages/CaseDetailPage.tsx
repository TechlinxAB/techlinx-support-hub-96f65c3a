import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, CheckCircle } from 'lucide-react';
import CaseDiscussion from '@/components/cases/CaseDiscussion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    cases, 
    companies, 
    users, 
    categories, 
    currentUser, 
    updateCase,
    refetchCases 
  } = useAppContext();
  
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    categoryId: ''
  });
  
  // Find the current case
  const currentCase = cases.find(c => c.id === id);
  const company = currentCase ? companies.find(c => c.id === currentCase.companyId) : null;
  const user = currentCase ? users.find(u => u.id === currentCase.userId) : null;
  const category = currentCase ? categories.find(c => c.id === currentCase.categoryId) : null;
  
  const isConsultant = currentUser?.role === 'consultant';
  const isOwnCase = currentCase?.userId === currentUser?.id;
  
  // Initialize edit form when case data is available
  useEffect(() => {
    if (currentCase) {
      setEditFormData({
        title: currentCase.title,
        description: currentCase.description,
        status: currentCase.status,
        priority: currentCase.priority,
        categoryId: currentCase.categoryId
      });
    }
  }, [currentCase]);
  
  if (!currentCase) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-lg text-muted-foreground">Case not found</p>
      </div>
    );
  }
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateCase(id!, {
        status: newStatus as any
      });
      
      toast({
        title: "Status Updated",
        description: `Case status changed to ${newStatus}`,
      });
      
      refetchCases();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update case status. Please try again.",
        variant: "destructive"
      });
      console.error("Error updating case status:", error);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateCase(id!, {
        title: editFormData.title,
        description: editFormData.description,
        status: editFormData.status as any,
        priority: editFormData.priority as any, 
        categoryId: editFormData.categoryId
      });
      
      setIsEditDialogOpen(false);
      
      toast({
        title: "Case Updated",
        description: "Case details have been successfully updated",
      });
      
      refetchCases();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update case details. Please try again.",
        variant: "destructive"
      });
      console.error("Error updating case:", error);
    }
  };
  
  // Update this function to use the new badge variants
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'new';
      case 'ongoing': return 'ongoing';
      case 'resolved': return 'awaiting';
      case 'completed': return 'completed';
      case 'draft': return 'secondary';
      default: return 'default';
    }
  };
  
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
      </div>
      
      {/* Case Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{currentCase.title}</h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={getStatusBadgeClass(currentCase.status)}>
                  {currentCase.status === 'new' ? 'New' : 
                   currentCase.status === 'ongoing' ? 'Ongoing' : 
                   currentCase.status === 'resolved' ? 'Awaiting' : 
                   currentCase.status === 'completed' ? 'Completed' : 
                   currentCase.status}
                </Badge>
                <Badge variant="outline" className={cn("status-badge", getPriorityBadgeClass(currentCase.priority))}>
                  {currentCase.priority}
                </Badge>
                {category && (
                  <Badge variant="outline" className="bg-gray-100">
                    {category.name}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm mb-4">
                <div className="mb-2">
                  <span className="font-medium">Submitted by: </span>
                  <span>{user?.name || 'Unknown'}</span>
                  {user?.email && <span className="ml-2 text-muted-foreground">({user.email})</span>}
                </div>
                
                {company && (
                  <div className="mb-2">
                    <span className="font-medium">Company: </span>
                    <span>{company.name}</span>
                  </div>
                )}
                
                <div className="flex gap-6">
                  <div>
                    <span className="font-medium">Created: </span>
                    <span>{format(new Date(currentCase.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Updated: </span>
                    <span>{format(new Date(currentCase.updatedAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-md font-medium mb-1">Description</h3>
                <p className="whitespace-pre-wrap text-sm">{currentCase.description}</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[200px]">
              {isConsultant && currentCase.status === 'resolved' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange('completed')}
                  className="gap-2 w-full"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm Resolution
                </Button>
              )}
              
              {isOwnCase && currentCase.status !== 'resolved' && currentCase.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange('resolved')}
                  className="w-full"
                >
                  Mark as Resolved
                </Button>
              )}
              
              {isConsultant && (
                <>
                  {currentCase.status !== 'completed' && (
                    <Select 
                      value={currentCase.status} 
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 w-full">
                        <Pencil className="h-4 w-4" />
                        Edit Case
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Case</DialogTitle>
                        <DialogDescription>
                          Make changes to the case details
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input 
                            id="title" 
                            value={editFormData.title} 
                            onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea 
                            id="description" 
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                            rows={4}
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                              value={editFormData.status}
                              onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                            >
                              <SelectTrigger id="status">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select 
                              value={editFormData.priority}
                              onValueChange={(value) => setEditFormData({...editFormData, priority: value})}
                            >
                              <SelectTrigger id="priority">
                                <SelectValue placeholder="Select Priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={editFormData.categoryId}
                              onValueChange={(value) => setEditFormData({...editFormData, categoryId: value})}
                            >
                              <SelectTrigger id="category">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Case Discussion */}
      <div>
        {id && <CaseDiscussion caseId={id} />}
      </div>
    </div>
  );
};

export default CaseDetailPage;
