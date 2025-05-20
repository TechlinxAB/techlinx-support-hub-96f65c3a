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
    if (!replies.length || !currentUser) {
      console.log(`[CaseDiscussionNotifier] No replies (${replies.length}) or no current user. Skipping notification check.`);
      return;
    }
    
    // Get the most recent reply
    const latestReply = replies[replies.length - 1];
    
    console.log(`[CaseDiscussionNotifier] Latest reply: ${latestReply.id} by user ${latestReply.userId}`);
    console.log(`[CaseDiscussionNotifier] Current user: ${currentUser.id} (${currentUser.role})`);
    console.log(`[CaseDiscussionNotifier] Last processed reply: ${lastProcessedReplyId.current}`);
    
    // Skip if we've already processed this reply
    if (lastProcessedReplyId.current === latestReply.id) {
      console.log(`[CaseDiscussionNotifier] Reply ${latestReply.id} already processed. Skipping.`);
      return;
    }
    
    // Check if this reply was just created (within the last 10 seconds)
    const replyTimestamp = new Date(latestReply.createdAt).getTime();
    const currentTimestamp = new Date().getTime();
    const timeDifference = currentTimestamp - replyTimestamp;
    
    console.log(`[CaseDiscussionNotifier] Reply age: ${timeDifference}ms (${timeDifference/1000} seconds)`);
    
    const replyIsRecent = timeDifference < 10000;
    
    if (!replyIsRecent) {
      console.log(`[CaseDiscussionNotifier] Reply ${latestReply.id} is not recent (${timeDifference/1000}s old). Skipping notification.`);
      // Still mark as processed to avoid checking it again
      lastProcessedReplyId.current = latestReply.id;
      return;
    }
    
    // Check if this is the current user's reply
    // We only send notifications about the current user's replies
    if (latestReply.userId !== currentUser.id) {
      console.log(`[CaseDiscussionNotifier] Reply ${latestReply.id} is not from current user. Skipping notification.`);
      // Still mark as processed to avoid checking it again
      lastProcessedReplyId.current = latestReply.id;
      return;
    }
    
    // Skip internal replies sent to users (internal replies are only visible to consultants)
    if (currentUser.role !== 'consultant' && latestReply.isInternal) {
      console.log(`[CaseDiscussionNotifier] Reply ${latestReply.id} is internal but current user is not a consultant. Skipping.`);
      lastProcessedReplyId.current = latestReply.id;
      return;
    }
    
    console.log(`[CaseDiscussionNotifier] Reply ${latestReply.id} is recent (${timeDifference/1000}s old) and from current user. Processing notification...`);
    
    // Determine if this is a user reply or consultant reply
    // If current user is a consultant, it's a consultant reply (notify the user)
    // Otherwise it's a user reply (notify the consultant)
    const isUserReply = currentUser.role !== 'consultant';
    
    console.log(`[CaseDiscussionNotifier] Sending ${isUserReply ? 'user' : 'consultant'} reply notification for case ${caseId}`);
    console.log(`[CaseDiscussionNotifier] Is internal reply: ${latestReply.isInternal}`);
    
    // Call the notification service to send the notification
    notificationService.sendReplyNotification(
      caseId,
      latestReply.id,
      isUserReply
    )
      .then(success => {
        console.log(`[CaseDiscussionNotifier] Notification service call completed. Success: ${success}`);
        // Mark this reply as processed
        lastProcessedReplyId.current = latestReply.id;
      })
      .catch(error => {
        console.error(`[CaseDiscussionNotifier] Error sending notification:`, error);
      });
  }, [replies, caseId, currentUser]);

  // This component doesn't render anything
  return null;
};

export default CaseDiscussionNotifier;
