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
import { useToast } from '@/hooks/use-toast';

interface CaseDiscussionProps {
  caseId: string;
}

// Cache helper for discussions
const discussionCache = {
  get: (caseId: string) => {
    try {
      const cached = localStorage.getItem(`discussion-cache-${caseId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Cache expires after 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  },
  
  set: (caseId: string, replies: any[], notes: any[]) => {
    try {
      localStorage.setItem(`discussion-cache-${caseId}`, JSON.stringify({
        data: { replies, notes },
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
};

// Utility function for exponential backoff retry
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, initialDelay = 300) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, retries - 1);
      const jitter = Math.random() * 200;
      
      console.log(`Retry ${retries}/${maxRetries} after ${delay + jitter}ms`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
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
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize with cached data if available
  useEffect(() => {
    const cached = discussionCache.get(caseId);
    if (cached) {
      setLocalReplies(cached.replies || []);
      setLocalNotes(cached.notes || []);
      
      // Still fetch fresh data, but we have something to show immediately
      console.log('Using cached discussion data while fetching fresh data');
    }
  }, [caseId]);

  // Debounced fetch function to prevent excessive requests
  const debouncedFetch = useCallback((caseId: string) => {
    // Don't fetch too frequently (at least 2 seconds between requests)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      // Clear existing timeout if it exists
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Set a new timeout
      fetchTimeoutRef.current = setTimeout(() => {
        debouncedFetch(caseId);
      }, 2000);
      
      return;
    }
    
    lastFetchTimeRef.current = now;
    
    setIsRefetching(true);
    setFetchError(null);
    
    Promise.all([
      retryOperation(() => refetchReplies(caseId)),
      retryOperation(() => refetchNotes(caseId))
    ])
      .then(() => {
        setOfflineMode(false);
        // Update the cache with fresh data
        const caseReplies = replies.filter(r => r.caseId === caseId);
        const caseNotes = notes.filter(n => n.caseId === caseId);
        discussionCache.set(caseId, caseReplies, caseNotes);
      })
      .catch(error => {
        console.error('Error fetching discussion data:', error);
        setFetchError('Failed to load discussion data. Using cached data if available.');
        setOfflineMode(true);
        
        toast({
          title: "Connection issue",
          description: "Displaying cached data. Click refresh to try again.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsRefetching(false);
      });
  }, [caseId, refetchReplies, refetchNotes, replies, notes, toast]);
  
  // Initial data fetch with limited frequency
  useEffect(() => {
    if (caseId) {
      debouncedFetch(caseId);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [caseId, debouncedFetch]);
  
  // Store pending submissions
  const storePendingSubmission = useCallback((type: 'reply' | 'note', data: any) => {
    try {
      const storageKey = type === 'reply' ? 'pendingReplies' : 'pendingNotes';
      const pending = JSON.parse(localStorage.getItem(storageKey) || '[]');
      pending.push({ ...data, timestamp: Date.now() });
      localStorage.setItem(storageKey, JSON.stringify(pending));
    } catch (error) {
      console.error(`Error storing pending ${type}:`, error);
    }
  }, []);
  
  // Merge replies and notes from context and local state (for optimistic updates)
  const mergedReplies = [...(offlineMode ? localReplies : replies.filter(r => r.caseId === caseId))];
  const mergedNotes = [...(offlineMode ? localNotes : notes.filter(n => n.caseId === caseId))];
  
  // Combine all items for display, sorted by date
  const allItems = [
    ...mergedReplies.map(r => ({
      ...r,
      type: 'reply',
      createdAt: new Date(r.createdAt)
    })),
    ...mergedNotes.map(n => ({
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
      // Create optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticReply = {
        id: tempId,
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        createdAt: new Date().toISOString(),
        isInternal: isInternalReply,
        isOptimistic: true
      };
      
      // Add to local state for immediate feedback
      setLocalReplies(prev => [...prev, optimisticReply]);
      
      // Attempt to save to server
      await addReply({
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        isInternal: isInternalReply
      });
      
      toast({
        title: "Reply sent",
        description: "Your reply has been added successfully.",
      });
      
      setReplyContent('');
      setIsInternalReply(false);
      setAttachments(null);
      
      // Refresh data after successful submission, but with a small delay
      setTimeout(() => debouncedFetch(caseId), 300);
    } catch (error) {
      console.error('Error adding reply:', error);
      
      // Store for later submission
      storePendingSubmission('reply', {
        caseId,
        userId: currentUser!.id,
        content: replyContent,
        isInternal: isInternalReply
      });
      
      toast({
        title: "Network issue",
        description: "Your reply is saved and will be sent when connection improves.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteContent.trim()) return;
    
    try {
      // Create optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticNote = {
        id: tempId,
        caseId,
        userId: currentUser!.id,
        content: noteContent,
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };
      
      // Add to local state for immediate feedback
      setLocalNotes(prev => [...prev, optimisticNote]);
      
      // Attempt to save to server
      await addNote({
        caseId,
        userId: currentUser!.id,
        content: noteContent,
      });
      
      toast({
        title: "Note added",
        description: "Your internal note has been added.",
      });
      
      setNoteContent('');
      
      // Refresh data after successful submission, but with a small delay
      setTimeout(() => debouncedFetch(caseId), 300);
    } catch (error) {
      console.error('Error adding note:', error);
      
      // Store for later submission
      storePendingSubmission('note', {
        caseId,
        userId: currentUser!.id,
        content: noteContent
      });
      
      toast({
        title: "Network issue",
        description: "Your note is saved and will be sent when connection improves.",
        variant: "destructive",
      });
    }
  };
  
  // Function to retry sending pending submissions
  const retryPendingSubmissions = useCallback(async () => {
    try {
      // Check for pending replies
      const pendingReplies = JSON.parse(localStorage.getItem('pendingReplies') || '[]');
      const thisItemReplies = pendingReplies.filter((item: any) => item.caseId === caseId);
      
      if (thisItemReplies.length > 0) {
        for (const item of thisItemReplies) {
          try {
            await addReply({
              caseId: item.caseId,
              userId: item.userId,
              content: item.content,
              isInternal: item.isInternal
            });
          } catch (error) {
            console.error('Failed to submit pending reply:', error);
            // Will keep in localStorage for next attempt
            continue;
          }
        }
        
        // Remove successfully processed items
        const remainingReplies = pendingReplies.filter((item: any) => item.caseId !== caseId);
        localStorage.setItem('pendingReplies', JSON.stringify(remainingReplies));
      }
      
      // Check for pending notes
      const pendingNotes = JSON.parse(localStorage.getItem('pendingNotes') || '[]');
      const thisItemNotes = pendingNotes.filter((item: any) => item.caseId === caseId);
      
      if (thisItemNotes.length > 0) {
        for (const item of thisItemNotes) {
          try {
            await addNote({
              caseId: item.caseId,
              userId: item.userId,
              content: item.content
            });
          } catch (error) {
            console.error('Failed to submit pending note:', error);
            // Will keep in localStorage for next attempt
            continue;
          }
        }
        
        // Remove successfully processed items
        const remainingNotes = pendingNotes.filter((item: any) => item.caseId !== caseId);
        localStorage.setItem('pendingNotes', JSON.stringify(remainingNotes));
      }
      
      if (thisItemReplies.length > 0 || thisItemNotes.length > 0) {
        toast({
          title: "Sync completed",
          description: "Your pending messages have been sent.",
        });
        
        // Refresh discussions
        debouncedFetch(caseId);
      }
    } catch (error) {
      console.error('Error syncing pending submissions:', error);
      toast({
        title: "Sync failed",
        description: "Unable to sync your pending messages. Will retry later.",
        variant: "destructive",
      });
    }
  }, [caseId, addReply, addNote, debouncedFetch, toast]);
  
  // Try to submit pending items when connection is restored
  useEffect(() => {
    if (!offlineMode) {
      const hasPendingItems = 
        (localStorage.getItem('pendingReplies') && localStorage.getItem('pendingReplies') !== '[]') || 
        (localStorage.getItem('pendingNotes') && localStorage.getItem('pendingNotes') !== '[]');
      
      if (hasPendingItems) {
        retryPendingSubmissions();
      }
    }
  }, [offlineMode, retryPendingSubmissions]);
  
  const handleRefresh = () => {
    setIsRefetching(true);
    setOfflineMode(false);
    debouncedFetch(caseId);
  };
  
  // If there's an error and no cached data
  if (fetchError && !offlineMode && localReplies.length === 0 && localNotes.length === 0) {
    return (
      <Card>
        <CardHeader>Discussion</CardHeader>
        <CardContent>
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button 
              onClick={handleRefresh} 
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
  
  // Show loading state only when we have no data at all
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
                onClick={handleRefresh}
                disabled={isRefetching}
                className="h-8 gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
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
