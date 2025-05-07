
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Paperclip, SendHorizontal, Lock, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

interface CaseDiscussionProps {
  caseId: string;
}

const CaseDiscussion: React.FC<CaseDiscussionProps> = ({ caseId }) => {
  const { 
    currentUser, 
    replies, 
    notes, 
    addReply, 
    addNote, 
    users, 
    loadingReplies, 
    loadingNotes, 
    refetchReplies,
    refetchNotes 
  } = useAppContext();
  
  const [replyContent, setReplyContent] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  
  const { toast } = useToast();
  const isConsultant = currentUser?.role === 'consultant';

  // Function to handle manual refetching with error handling
  const handleRefetch = async () => {
    setIsRefetching(true);
    setFetchError(null);
    
    try {
      await Promise.all([
        refetchReplies(caseId),
        refetchNotes(caseId)
      ]);
    } catch (error) {
      setFetchError('Failed to load discussion. Please try again later.');
      console.error('Error refetching data:', error);
    } finally {
      setIsRefetching(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (caseId) {
      handleRefetch();
    }
  }, [caseId]); // Only depend on caseId to prevent refetch loops
  
  // Merge replies and notes, sort by date
  const allItems = [
    ...replies.filter(r => r.caseId === caseId).map(r => ({
      ...r,
      type: 'reply',
      createdAt: new Date(r.createdAt)
    })),
    ...notes.filter(n => n.caseId === caseId).map(n => ({
      ...n,
      type: 'note',
      createdAt: new Date(n.createdAt)
    }))
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(e.target.files);
    }
  };
  
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) return;
    
    try {
      await addReply({
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        isInternal: isInternalReply
      });
      
      setReplyContent('');
      setIsInternalReply(false);
      setAttachments(null);
      
      toast({
        title: "Reply sent",
        description: "Your reply has been added to the discussion.",
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      toast({
        title: "Failed to send reply",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteContent.trim()) return;
    
    try {
      await addNote({
        caseId,
        userId: currentUser!.id,
        content: noteContent,
      });
      
      setNoteContent('');
      
      toast({
        title: "Note added",
        description: "Your internal note has been added.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Failed to add note",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  if (fetchError) {
    return (
      <Card>
        <CardHeader>Discussion</CardHeader>
        <CardContent>
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button 
              onClick={handleRefetch} 
              variant="outline"
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (loadingReplies || loadingNotes || isRefetching) {
    return (
      <Card>
        <CardHeader>Discussion</CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <p className="text-muted-foreground">Loading discussion...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Discussion</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefetch}
              disabled={isRefetching}
              className="h-8 gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {allItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allItems.map((item) => {
                const author = users.find(u => u.id === item.userId);
                
                if (item.type === 'note' && !isConsultant) {
                  // Don't show internal notes to regular users
                  return null;
                }
                
                const isUserMessage = item.userId === currentUser?.id;
                
                return (
                  <div 
                    key={`${item.type}-${item.id}`}
                    className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] ${
                        item.type === 'note' 
                          ? 'bg-orange-50 border-orange-200' 
                          : (item as any).isInternal 
                            ? 'bg-gray-50 border-gray-200'
                            : isUserMessage
                              ? 'bg-primary-foreground border-primary/20'
                              : 'bg-muted border-muted-foreground/20'
                      } border rounded-lg p-3`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {author?.name || 'Unknown'}
                          </span>
                          {item.type === 'note' && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                              Internal Note
                            </Badge>
                          )}
                          {item.type === 'reply' && (item as any).isInternal && (
                            <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-200">
                              <Lock className="h-3 w-3" /> Internal
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <form onSubmit={handleAddReply} className="pt-4">
            <Textarea 
              placeholder="Type your reply..." 
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              className="mb-3"
            />
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3">
                <Input 
                  type="file" 
                  multiple 
                  onChange={handleAttachmentChange}
                  className="max-w-xs"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {isConsultant && (
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="internal" 
                      checked={isInternalReply}
                      onCheckedChange={setIsInternalReply}
                    />
                    <Label htmlFor="internal" className="text-sm">Internal reply</Label>
                  </div>
                )}
                
                <Button type="submit" className="gap-2">
                  <SendHorizontal className="h-4 w-4" />
                  Send Reply
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {isConsultant && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold">Internal Notes</h3>
            <p className="text-sm text-muted-foreground">
              Notes are only visible to consultants
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddNote} className="space-y-3">
              <Textarea 
                placeholder="Add internal note..." 
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
              />
              
              <div className="flex justify-end">
                <Button type="submit">Add Note</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CaseDiscussion;
