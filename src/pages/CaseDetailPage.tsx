
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MessageCircle, 
  FileText,
  Send,
  Pencil 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    cases, 
    users, 
    companies, 
    categories, 
    replies, 
    notes, 
    currentUser, 
    updateCase, 
    addReply, 
    addNote 
  } = useAppContext();
  
  const [replyContent, setReplyContent] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<string | undefined>(undefined);
  const [editPriority, setEditPriority] = useState<string | undefined>(undefined);
  const [editAssignedToId, setEditAssignedToId] = useState<string | undefined>(undefined);
  
  // Find the case
  const caseItem = cases.find(c => c.id === id);
  
  if (!caseItem) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Case not found</h1>
        <Button onClick={() => navigate('/cases')}>Return to Cases</Button>
      </div>
    );
  }
  
  const user = users.find(u => u.id === caseItem.userId);
  const company = companies.find(c => c.id === caseItem.companyId);
  const category = categories.find(c => c.id === caseItem.categoryId);
  const assignedTo = caseItem.assignedToId 
    ? users.find(u => u.id === caseItem.assignedToId)
    : undefined;
  
  const caseReplies = replies.filter(r => r.caseId === caseItem.id);
  const caseNotes = notes.filter(n => n.caseId === caseItem.id);
  
  const handleSubmitReply = () => {
    if (!replyContent.trim() || !currentUser) return;
    
    addReply({
      caseId: caseItem.id,
      userId: currentUser.id,
      content: replyContent,
      isInternal: false
    });
    
    setReplyContent('');
  };
  
  const handleSubmitNote = () => {
    if (!noteContent.trim() || !currentUser) return;
    
    addNote({
      caseId: caseItem.id,
      userId: currentUser.id,
      content: noteContent
    });
    
    setNoteContent('');
  };
  
  const handleSaveChanges = () => {
    const updates: any = {};
    
    if (editStatus !== undefined) {
      updates.status = editStatus;
    }
    
    if (editPriority !== undefined) {
      updates.priority = editPriority;
    }
    
    if (editAssignedToId !== undefined) {
      updates.assignedToId = editAssignedToId === 'none' ? undefined : editAssignedToId;
    }
    
    if (Object.keys(updates).length > 0) {
      updateCase(caseItem.id, updates);
    }
    
    setIsEditing(false);
    setEditStatus(undefined);
    setEditPriority(undefined);
    setEditAssignedToId(undefined);
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
  
  const isConsultant = currentUser?.role === 'consultant';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-xl font-bold">{caseItem.title}</h1>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Badge variant="outline" className={cn("status-badge", getStatusBadgeClass())}>
                    {caseItem.status}
                  </Badge>
                  <Badge variant="outline" className={cn("status-badge", getPriorityBadgeClass())}>
                    {caseItem.priority}
                  </Badge>
                  {isConsultant && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Select
                    defaultValue={caseItem.status}
                    onValueChange={setEditStatus}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    defaultValue={caseItem.priority}
                    onValueChange={setEditPriority}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="default" size="sm" onClick={handleSaveChanges}>
                    Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created by:</span>
                <span>{user?.name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Company:</span>
                <span>{company?.name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Category:</span>
                <span>{category?.name}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created:</span>
                <span>{format(new Date(caseItem.createdAt), 'PPp')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Last updated:</span>
                <span>{format(new Date(caseItem.updatedAt), 'PPp')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Assigned to:</span>
                {!isEditing ? (
                  <span>{assignedTo?.name || 'Unassigned'}</span>
                ) : (
                  <Select 
                    defaultValue={caseItem.assignedToId || 'none'} 
                    onValueChange={setEditAssignedToId}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Assign to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users
                        .filter(u => u.role === 'consultant')
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-medium">Description</h3>
            <p className="text-sm whitespace-pre-line">{caseItem.description}</p>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="replies">
        <TabsList>
          <TabsTrigger value="replies" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Replies
          </TabsTrigger>
          {isConsultant && (
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Internal Notes
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="replies" className="space-y-4 mt-4">
          {caseReplies.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No replies yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {caseReplies.map(reply => {
                const replyUser = users.find(u => u.id === reply.userId);
                return (
                  <Card key={reply.id}>
                    <CardHeader className="py-3">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground mr-2">
                            {replyUser?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{replyUser?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(reply.createdAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm whitespace-pre-line">{reply.content}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          <Card>
            <CardHeader className="py-3">
              <h3 className="text-sm font-medium">Add Reply</h3>
            </CardHeader>
            <CardContent className="py-2">
              <Textarea 
                value={replyContent} 
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Type your reply here..."
                rows={4}
              />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                onClick={handleSubmitReply} 
                disabled={!replyContent.trim()}
                className="ml-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {isConsultant && (
          <TabsContent value="notes" className="space-y-4 mt-4">
            {caseNotes.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">No internal notes yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {caseNotes.map(note => {
                  const noteUser = users.find(u => u.id === note.userId);
                  return (
                    <Card key={note.id}>
                      <CardHeader className="py-3">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground mr-2">
                              {noteUser?.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{noteUser?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(note.createdAt), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm whitespace-pre-line">{note.content}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            <Card>
              <CardHeader className="py-3">
                <h3 className="text-sm font-medium">Add Internal Note</h3>
              </CardHeader>
              <CardContent className="py-2">
                <Textarea 
                  value={noteContent} 
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Type your internal note here..."
                  rows={4}
                />
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  onClick={handleSubmitNote} 
                  disabled={!noteContent.trim()}
                  className="ml-auto"
                  variant="secondary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default CaseDetailPage;
