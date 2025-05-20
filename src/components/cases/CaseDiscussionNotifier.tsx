
import React from 'react';
import { Reply } from '@/context/AppContext';

interface CaseDiscussionNotifierProps {
  caseId: string;
  replies: (Reply & { userRole?: string })[];
}

/**
 * This component no longer needs to handle notifications.
 * Notifications are now triggered automatically by a database trigger when a new reply is inserted.
 * This component is kept for backward compatibility in case other components expect it to exist.
 */
const CaseDiscussionNotifier: React.FC<CaseDiscussionNotifierProps> = () => {
  console.log("[CaseDiscussionNotifier] Notification system now uses database triggers");
  
  // No UI to render
  return null;
};

export default CaseDiscussionNotifier;
