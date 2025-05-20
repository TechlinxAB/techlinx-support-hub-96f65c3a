
import { useEffect } from 'react';
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
  
  // Track the last reply and send notifications if needed
  useEffect(() => {
    // Only proceed if we have replies and a current user
    if (!replies.length || !currentUser) return;
    
    // Get the most recent reply
    const latestReply = replies[replies.length - 1];
    
    // Check if this reply was just created (within the last 5 seconds)
    const replyIsRecent = 
      (new Date().getTime() - latestReply.createdAt.getTime()) < 5000;
    
    // Only send notification for recent replies that aren't from the current user
    if (replyIsRecent && latestReply.userId !== currentUser.id) {
      return;
    }
    
    // If it's a new reply from the current user, determine user type and send notification
    if (replyIsRecent && latestReply.userId === currentUser.id) {
      const isUserReply = currentUser.role !== 'consultant';
      notificationService.sendReplyNotification(
        caseId,
        latestReply.id,
        isUserReply
      );
    }
  }, [replies, caseId, currentUser]);

  // This component doesn't render anything
  return null;
};

export default CaseDiscussionNotifier;
