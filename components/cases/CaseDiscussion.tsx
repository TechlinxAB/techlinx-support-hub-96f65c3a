
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// Utility function for exponential backoff retry
const retryFetch = async (fn: () => Promise<any>, maxRetries = 5, initialDelay = 300) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      
      if (retries === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff (300ms, 600ms, 1200ms, etc.)
      const delay = initialDelay * Math.pow(2, retries - 1);
      
      // Add some randomness to prevent synchronized retries
      const jitter = Math.random() * 300;
      
      console.log(`Retry ${retries}/${maxRetries} after ${delay + jitter}ms`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
};

// Helper to interact with local storage
const localStorageCache = {
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.log('Unable to cache in localStorage');
    }
  }
};

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
  const [localReplies, setLocalReplies] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const { toast } = useToast();
  const isConsultant = currentUser?.role === 'consultant';
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache the case discussion data
  useEffect(() => {
    const cachedDiscussion = localStorageCache.getItem(`case-discussion-${caseId}`);
    
    if (cachedDiscussion) {
      if (cachedDiscussion.replies) setLocalReplies(cachedDiscussion.replies);
      if (cachedDiscussion.notes) setLocalNotes(cachedDiscussion.notes);
    }
  }, [caseId]);
  
  // Update cache when data changes
  useEffect(() => {
    if (replies.length > 0 || notes.length > 0) {
      const caseReplies = replies.filter(r => r.caseId === caseId);
      const caseNotes = notes.filter(n => n.caseId === caseId);
      
      localStorageCache.setItem(`case-discussion-${caseId}`, {
        replies: caseReplies,
        notes: caseNotes,
        timestamp: new Date().toISOString()
      });
      
      setLocalReplies(caseReplies);
      setLocalNotes(caseNotes);
    }
  }, [replies, notes, caseId]);
  
  // Function to handle manual refetching with error handling and retry
  const handleRefetch = useCallback(async () => {
    // Clear previous timer if it exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Debounce the refetch
    debounceTimerRef.current = setTimeout(async () => {
      setIsRefetching(true);
      setFetchError(null);
      setOfflineMode(false);
      
      try {
        await Promise.all([
          retryFetch(() => refetchReplies(caseId)),
          retryFetch(() => refetchNotes(caseId))
        ]);
        
        toast({
          title: "Refreshed",
          description: "Discussion data has been refreshed",
        });
      } catch (error) {
        console.error('Error refetching data:', error);
        setFetchError('Failed to load discussion data. You can view cached data or try again later.');
        setOfflineMode(true);
        
        toast({
          title: "Connection issue",
          description: "Using cached data where available. Retry when connection improves.",
          variant: "destructive"
        });
      } finally {
        setIsRefetching(false);
      }
    }, 300); // 300ms debounce
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [caseId, refetchReplies, refetchNotes, toast]);
  
  // Initial data fetch - only run once when component mounts or caseId changes
  useEffect(() => {
    if (caseId) {
      handleRefetch();
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [caseId, handleRefetch]); // Only depend on caseId and handleRefetch to prevent refetch loops
  
  // Merge replies and notes, sort by date (prioritize local state if in offline mode)
  const allItems = [
    ...(offlineMode ? localReplies : replies.filter(r => r.caseId === caseId)).map(r => ({
      ...r,
      type: 'reply',
      createdAt: new Date(r.createdAt)
    })),
    ...(offlineMode ? localNotes : notes.filter(n => n.caseId === caseId)).map(n => ({
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
      // Optimistic update for UI responsiveness
      const tempId = `temp-${Date.now()}`;
      const optimisticReply = {
        id: tempId,
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        createdAt: new Date(),
        isInternal: isInternalReply,
        isOptimistic: true
      };
      
      setLocalReplies(prev => [...prev, optimisticReply]);
      
      // Save to the server with retry
      await retryFetch(() => addReply({
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        isInternal: isInternalReply
      }));
      
      setReplyContent('');
      setIsInternalReply(false);
      setAttachments(null);
      
      toast({
        title: "Reply sent",
        description: "Your reply has been added to the discussion.",
      });
      
      // Refresh the data after a successful submission
      handleRefetch();
    } catch (error) {
      console.error('Error adding reply:', error);
      
      toast({
        title: "Failed to send reply",
        description: "Your reply is saved locally and will be sent when connection is restored.",
        variant: "destructive",
      });
      
      // Store unsent messages for later sync
      const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
      pendingMessages.push({
        type: 'reply',
        caseId,
        userId: currentUser!.id, 
        content: replyContent,
        isInternal: isInternalReply,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
    }
  };
  
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteContent.trim()) return;
    
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticNote = {
        id: tempId,
        caseId,
        userId: currentUser!.id,
        content: noteContent,
        createdAt: new Date(),
        isOptimistic: true
      };
      
      setLocalNotes(prev => [...prev, optimisticNote]);
      
      // Save to server with retry
      await retryFetch(() => addNote({
        caseId,
        userId: currentUser!.id,
        content: noteContent,
      }));
      
      setNoteContent('');
      
      toast({
        title: "Note added",
        description: "Your internal note has been added.",
      });
      
      // Refresh data after successful submission
      handleRefetch();
    } catch (error) {
      console.error('Error adding note:', error);
      
      toast({
        title: "Failed to add note",
        description: "Your note is saved locally and will be added when connection is restored.",
        variant: "destructive",
      });
      
      // Store unsent notes for later sync
      const pendingNotes = JSON.parse(localStorage.getItem('pendingNotes') || '[]');
      pendingNotes.push({
        type: 'note',
        caseId,
        userId: currentUser!.id,
        content: noteContent,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingNotes', JSON.stringify(pendingNotes));
    }
  };
  
  const retryPendingMessages = async () => {
    // Try to send any pending messages
    const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    const pendingNotes = JSON.parse(localStorage.getItem('pendingNotes') || '[]');
    
    if (pendingMessages.length === 0 && pendingNotes.length === 0) return;
    
    try {
      // Process replies
      for (const message of pendingMessages) {
        if (message.caseId === caseId) {
          await addReply({
            caseId: message.caseId,
            userId: message.userId,
            content: message.content,
            isInternal: message.isInternal
          });
        }
      }
      
      // Process notes
      for (const note of pendingNotes) {
        if (note.caseId === caseId) {
          await addNote({
            caseId: note.caseId,
            userId: note.userId,
            content: note.content
          });
        }
      }
      
      // Clear pending items
      localStorage.setItem('pendingMessages', JSON.stringify(
        pendingMessages.filter((m: any) => m.caseId !== caseId)
      ));
      
      localStorage.setItem('pendingNotes', JSON.stringify(
        pendingNotes.filter((n: any) => n.caseId !== caseId)
      ));
      
      toast({
        title: "Sync completed",
        description: "Your pending messages have been sent.",
      });
      
      handleRefetch();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Unable to sync your pending messages. Will retry later.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    // Attempt to send pending messages when component loads
    if (!offlineMode && (localStorage.getItem('pendingMessages') || localStorage.getItem('pendingNotes'))) {
      retryPendingMessages();
    }
  }, [offlineMode]); // eslint-disable-line react-hooks/exhaustive-deps
  
  if (fetchError && !offlineMode) {
    return (
      <Card>
        <CardHeader>Discussion</CardHeader>
        <CardContent>
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-4">
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
            
            <Button
              onClick={() => setOfflineMode(true)}
              variant="secondary"
            >
              View Cached Discussions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if ((loadingReplies || loadingNotes || isRefetching) && allItems.length === 0) {
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
            <div className="flex items-center gap-2">
              {offlineMode && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Offline Mode
                </Badge>
              )}
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
          </div>
          {offlineMode && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing cached discussions. Some messages may be pending upload.
            </p>
          )}
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
                const isOptimistic = (item as any).isOptimistic;
                
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
                      } border rounded-lg p-3 ${isOptimistic ? 'opacity-70' : ''}`}
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
                          {isOptimistic && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                              Sending...
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
