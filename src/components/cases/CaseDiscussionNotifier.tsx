
import React from 'react';
import { Reply } from '@/context/AppContext';

interface CaseDiscussionNotifierProps {
  caseId: string;
  replies: (Reply & { userRole?: string })[];
}

/**
 * This component is a placeholder.
 * We're implementing a different notification approach directly in the CaseDiscussion component.
 */
const CaseDiscussionNotifier: React.FC<CaseDiscussionNotifierProps> = () => {
  // No UI to render
  return null;
};

export default CaseDiscussionNotifier;
