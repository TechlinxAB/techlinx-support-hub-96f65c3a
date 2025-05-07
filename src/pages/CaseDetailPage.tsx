
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, CheckCircle, Send } from 'lucide-react';
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
    categoryId: '',
    assignedToId: ''
  });
  
  // Find the current case
  const currentCase = cases.find(c => c.id === id);
  const company = currentCase ? companies.find(c => c.id === currentCase.companyId) : null;
  const user = currentCase ? users.find(u => u.id === currentCase.userId) : null;
  const assignedTo = currentCase?.assignedToId ? users.find(u => u.id === currentCase.assignedToId) : null;
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
        categoryId: currentCase.categoryId,
        assignedToId: currentCase.assignedToId || ''
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
        categoryId: editFormData.categoryId,
        assignedToId: editFormData.assignedToId || undefined
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
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'draft': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default: return '';
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
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{currentCase.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={cn("status-badge", getStatusBadgeClass(currentCase.status))}>
              {currentCase.status}
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
        </div>
        
        <div className="flex gap-2">
          {isConsultant && currentCase.status === 'resolved' && (
            <Button 
              variant="outline" 
              onClick={() => handleStatusChange('completed')}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Resolution
            </Button>
          )}
          
          {isOwnCase && currentCase.status !== 'resolved' && currentCase.status !== 'completed' && (
            <Button 
              variant="outline" 
              onClick={() => handleStatusChange('resolved')}
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
                  <SelectTrigger className="w-[180px]">
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
                  <Button variant="outline" className="gap-2">
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Assigned To</Label>
                        <Select 
                          value={editFormData.assignedToId}
                          onValueChange={(value) => setEditFormData({...editFormData, assignedToId: value})}
                        >
                          <SelectTrigger id="assignedTo">
                            <SelectValue placeholder="Select Consultant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {users
                              .filter(u => u.role === 'consultant')
                              .map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))
                            }
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {id && <CaseDiscussion caseId={id} />}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Case Details</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1 whitespace-pre-wrap">{currentCase.description}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Submitted By</h4>
                <div className="mt-1">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm">{user?.email}</p>
                  {user?.phone && <p className="text-sm">{user.phone}</p>}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Company</h4>
                <p className="mt-1 font-medium">{company?.name}</p>
              </div>
              
              {assignedTo && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Assigned To</h4>
                  <p className="mt-1 font-medium">{assignedTo.name}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Dates</h4>
                <div className="mt-1 text-sm">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{format(new Date(currentCase.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated:</span>
                    <span>{format(new Date(currentCase.updatedAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
                <p className="mt-1 text-sm text-muted-foreground">No attachments</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
