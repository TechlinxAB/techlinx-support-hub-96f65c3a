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
    
    // Only send notification for recent replies that are created by the current user
    // This ensures we send notifications about our own replies to the other party
    if (replyIsRecent && latestReply.userId === currentUser.id) {
      console.log("Recent reply detected - processing notification");
      
      // Determine if this is a user reply or consultant reply
      // If current user is a consultant, it's a consultant reply (notify the user)
      // Otherwise it's a user reply (notify the consultant)
      const isUserReply = currentUser.role !== 'consultant';
      
      console.log(`Sending ${isUserReply ? 'user' : 'consultant'} reply notification for case ${caseId}`);
      
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
