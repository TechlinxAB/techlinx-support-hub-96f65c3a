import React, { useEffect, useRef } from 'react';
import { Reply } from '@/context/AppContext';

interface CaseDiscussionNotifierProps {
  caseId: string;
  replies: (Reply & { userRole?: string })[];
}

/**
 * This component used to handle notifications for new replies.
 * Now notifications are handled automatically via a database trigger,
 * so this component is just a placeholder for backward compatibility.
 */
const CaseDiscussionNotifier: React.FC<CaseDiscussionNotifierProps> = ({ caseId, replies }) => {
  // Keep track of the latest processed reply to avoid duplicate processing
  const processedRepliesRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Just log that notifications are now handled by the database
    console.log("[CaseDiscussionNotifier] Notifications are now handled by database triggers");
    
    // No cleanup needed
    return () => {};
  }, [caseId]);
  
  // No UI to render
  return null;
};

export default CaseDiscussionNotifier;
