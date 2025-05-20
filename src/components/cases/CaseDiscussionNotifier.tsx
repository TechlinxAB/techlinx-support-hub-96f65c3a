
import { useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { notificationService } from '@/services/notificationService';
import { Reply } from '@/context/AppContext';

interface CaseDiscussionNotifierProps {
  caseId: string;
  replies: Reply[];
}

/**
 * This component doesn't render anything but watches for new replies
 * and triggers notifications when needed
 */
const CaseDiscussionNotifier: React.FC<CaseDiscussionNotifierProps> = ({ 
  caseId, 
  replies 
}) => {
  const { currentUser } = useAppContext();
  const lastProcessedReplyId = useRef<string | null>(null);
  
  // Track the last reply and send notifications if needed
  useEffect(() => {
    // Only proceed if we have replies and a current user
    if (!replies.length || !currentUser) return;
    
    // Get the most recent reply
    const latestReply = replies[replies.length - 1];
    
    // Skip if we've already processed this reply
    if (lastProcessedReplyId.current === latestReply.id) return;
    
    // Check if this reply was just created (within the last 10 seconds)
    const replyIsRecent = 
      (new Date().getTime() - new Date(latestReply.createdAt).getTime()) < 10000;
    
    // Only send notification for recent replies that are from the current user
    if (replyIsRecent && latestReply.userId === currentUser.id) {
      const isUserReply = currentUser.role !== 'consultant';
      notificationService.sendReplyNotification(
        caseId,
        latestReply.id,
        isUserReply
      );
      
      // Mark this reply as processed
      lastProcessedReplyId.current = latestReply.id;
    }
  }, [replies, caseId, currentUser]);

  // This component doesn't render anything
  return null;
};

export default CaseDiscussionNotifier;
