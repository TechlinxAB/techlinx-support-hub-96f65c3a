import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { 
  Paperclip, 
  SendHorizontal, 
  Lock, 
  RefreshCw, 
  File, 
  FileText, 
  X, 
  Trash2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';

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
  
  set: (caseId: string, replies: any[], notes: any[], attachments: any[]) => {
    try {
      localStorage.setItem(`discussion-cache-${caseId}`, JSON.stringify({
        data: { replies, notes, attachments },
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

// Get file size in human readable format
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file icon based on mime type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <File className="h-4 w-4" />;
  if (mimeType.startsWith('text/')) return <FileText className="h-4 w-4" />;
  if (mimeType.startsWith('application/pdf')) return <FileText className="h-4 w-4" />;
  return <Paperclip className="h-4 w-4" />;
};

const CaseDiscussion: React.FC<CaseDiscussionProps> = ({ caseId }) => {
  const { 
    currentUser, 
    replies, 
    notes, 
    addReply, 
    addNote, 
    deleteReply,
    users, 
    loadingReplies, 
    loadingNotes, 
    refetchReplies,
    refetchNotes,
    caseAttachments,
    loadingAttachments,
    refetchAttachments,
    uploadAttachment
  } = useAppContext();
  
  const [replyContent, setReplyContent] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [localReplies, setLocalReplies] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const isConsultant = currentUser?.role === 'consultant';
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      retryOperation(() => refetchNotes(caseId)),
      retryOperation(() => refetchAttachments(caseId))
    ])
      .then(() => {
        setOfflineMode(false);
        // Update the cache with fresh data
        const caseReplies = replies.filter(r => r.caseId === caseId);
        const caseNotes = notes.filter(n => n.caseId === caseId);
        const caseFiles = caseAttachments.filter(a => a.caseId === caseId);
        discussionCache.set(caseId, caseReplies, caseNotes, caseFiles);
        setDataFetched(true);
      })
      .catch(error => {
        console.error('Error fetching discussion data:', error);
        setFetchError('Failed to load discussion data. Using cached data if available.');
        setOfflineMode(true);
        setDataFetched(true);
        
        toast({
          title: "Connection issue",
          description: "Displaying cached data. Click refresh to try again.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsRefetching(false);
      });
  }, [caseId, refetchReplies, refetchNotes, refetchAttachments, replies, notes, caseAttachments, toast]);
  
  // Initial data fetch with limited frequency, but only ONCE
  useEffect(() => {
    if (caseId && !dataFetched) {
      debouncedFetch(caseId);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [caseId, debouncedFetch, dataFetched]);
  
  // Merge replies and notes from context and local state (for optimistic updates)
  const mergedReplies = [...(offlineMode ? localReplies : replies.filter(r => r.caseId === caseId))];
  const mergedNotes = [...(offlineMode ? localNotes : notes.filter(n => n.caseId === caseId))];
  const caseFiles = caseAttachments.filter(a => a.caseId === caseId);
  
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
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to array for easier management
      const filesArray = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...filesArray]);
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Upload a single file and return its path
  const uploadFile = async (file: File, replyId: string): Promise<string | null> => {
    try {
      // Generate a unique file path to prevent overwriting
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${caseId}/${replyId}/${fileName}`;
      
      // Start tracking upload progress for this file
      const uploadId = `${file.name}-${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Upload the file to Supabase Storage with progress tracking
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      // After upload completes, set progress to 100%
      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
      
      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }
      
      return filePath;
    } catch (error) {
      console.error('Exception during file upload:', error);
      return null;
    }
  };
  
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim() && attachments.length === 0) {
      toast({
        title: "Empty reply",
        description: "Please add some text or attach files to send a reply.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // First, add the reply to get a reply ID
      const newReply = await addReply({
        caseId,
        userId: currentUser!.id,
        content: replyContent || "(No message)", // Use placeholder if only attachments
        isInternal: isInternalReply
      });
      
      if (!newReply || !newReply.id) {
        throw new Error("Failed to create reply");
      }
      
      const replyId = newReply.id;
      
      // If there are attachments, upload them
      if (attachments.length > 0) {
        for (const file of attachments) {
          // Upload the file
          const filePath = await uploadFile(file, replyId);
          
          if (filePath) {
            // Save attachment metadata in the database
            await uploadAttachment({
              caseId,
              replyId: replyId,
              fileName: file.name,
              filePath,
              contentType: file.type,
              size: file.size,
              createdBy: currentUser!.id
            });
          }
        }
      }
      
      toast({
        title: "Reply sent",
        description: attachments.length > 0 
          ? `Your reply with ${attachments.length} attachment(s) has been added.` 
          : "Your reply has been added successfully."
      });
      
      // Clear form
      setReplyContent('');
      setIsInternalReply(false);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh data after successful submission
      debouncedFetch(caseId);
      
    } catch (error) {
      console.error('Error adding reply with attachments:', error);
      
      toast({
        title: "Failed to send",
        description: "There was an error sending your reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };
  
  const handleDeleteReply = async (replyId: string) => {
    try {
      await deleteReply(replyId);
      
      toast({
        title: "Reply deleted",
        description: "The reply has been deleted successfully."
      });
      
      debouncedFetch(caseId);
    } catch (error) {
      console.error('Error deleting reply:', error);
      
      toast({
        title: "Delete failed",
        description: "There was an error deleting the reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReplyToDelete(null);
    }
  };
  
  const handleRefresh = () => {
    setIsRefetching(true);
    setOfflineMode(false);
    debouncedFetch(caseId);
  };
  
  // Get attachments for a specific reply
  const getReplyAttachments = (replyId: string) => {
    return caseAttachments.filter(attachment => attachment.replyId === replyId);
  };
  
  // Calculate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Generate a download URL for an attachment
  const getDownloadUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('case-attachments')
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds
      
      if (error || !data?.signedUrl) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Exception getting download URL:', error);
      return null;
    }
  };
  
  const handleDownload = async (attachment: any) => {
    try {
      const url = await getDownloadUrl(attachment.filePath);
      
      if (!url) {
        toast({
          title: "Download failed",
          description: "Could not generate download link. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Create a temporary link and simulate click to download
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the file.",
        variant: "destructive"
      });
    }
  };
  
  // Preview for image attachments
  const renderAttachmentPreview = (attachment: any) => {
    if (attachment.contentType?.startsWith('image/')) {
      return (
        <img
          src={`https://uaoeabhtbynyfzyfzogp.supabase.co/storage/v1/object/public/case-attachments/${attachment.filePath}`}
          alt={attachment.fileName}
          className="mt-2 max-h-60 rounded-md object-contain bg-gray-50"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return null;
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
  if ((loadingReplies || loadingNotes || loadingAttachments || isRefetching) && allItems.length === 0) {
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
    <div>
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
        
        <CardContent>
          {allItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {allItems.map((item, index) => {
                const author = users.find(u => u.id === item.userId);
                
                if (item.type === 'note' && !isConsultant) {
                  // Don't show internal notes to regular users
                  return null;
                }
                
                const isOptimistic = (item as any).isOptimistic;
                const initials = author?.name ? getInitials(author.name) : "??";
                
                // Get attachments for this reply
                const replyAttachments = item.type === 'reply' 
                  ? getReplyAttachments(item.id) 
                  : [];
                
                return (
                  <div 
                    key={`${item.type}-${item.id}`}
                    className="flex gap-4"
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {author?.name || 'Unknown'}
                          </span>
                          
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(item.createdAt, { addSuffix: true })}
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
                        
                        {isConsultant && item.type === 'reply' && !isOptimistic && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyToDelete(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Reply</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this reply? 
                                  This will also remove any attached files.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReply(item.id);
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      
                      <div className={`p-3 rounded-md ${
                        item.type === 'note' 
                          ? 'bg-orange-50 border border-orange-200' 
                          : (item as any).isInternal 
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-white border border-gray-200'
                      } ${isOptimistic ? 'opacity-70' : ''}`}>
                        <p className="whitespace-pre-wrap">{item.content}</p>
                        
                        {/* Display attachments */}
                        {replyAttachments.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
                            <p className="text-xs font-medium text-gray-500">Attachments:</p>
                            <div className="flex flex-wrap gap-2">
                              {replyAttachments.map((attachment: any) => (
                                <div 
                                  key={attachment.id} 
                                  className="flex flex-col border rounded-md overflow-hidden"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs justify-start gap-2 p-2 h-auto"
                                    onClick={() => handleDownload(attachment)}
                                  >
                                    {getFileIcon(attachment.contentType)}
                                    <span className="truncate max-w-40">{attachment.fileName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({formatFileSize(attachment.size)})
                                    </span>
                                  </Button>
                                  {renderAttachmentPreview(attachment)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-8 pt-4 border-t border-gray-200">
            <form onSubmit={handleAddReply} className="space-y-4">
              <Textarea 
                placeholder="Type your reply..." 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                className="w-full"
                disabled={isUploading}
              />
              
              {/* Display selected file previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div 
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 bg-gray-50 border rounded-md p-2"
                    >
                      {file.type.startsWith('image/') ? (
                        <div className="h-8 w-8 relative">
                          <img 
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-full w-full object-cover rounded"
                          />
                        </div>
                      ) : (
                        getFileIcon(file.type) 
                      )}
                      <span className="text-sm truncate max-w-36">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 ml-auto"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload progress */}
              {isUploading && Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm">Uploading files...</p>
                  <Progress value={
                    Object.values(uploadProgress).reduce((sum, current) => sum + current, 0) / 
                    (Object.values(uploadProgress).length * 100) * 100
                  } />
                </div>
              )}
              
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center">
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleAttachmentChange}
                    id="file-upload"
                    ref={fileInputRef}
                    className="max-w-xs"
                    disabled={isUploading}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  {isConsultant && (
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="internal" 
                        checked={isInternalReply}
                        onCheckedChange={setIsInternalReply}
                        disabled={isUploading}
                      />
                      <Label htmlFor="internal" className="text-sm">Internal reply</Label>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="gap-2"
                    disabled={isUploading || (!replyContent.trim() && attachments.length === 0)}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="h-4 w-4" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseDiscussion;
