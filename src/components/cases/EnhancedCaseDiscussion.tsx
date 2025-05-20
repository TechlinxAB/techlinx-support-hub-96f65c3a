
import React, { useEffect } from 'react';
import CaseDiscussion from './CaseDiscussion'; // Import the original component
import CaseDiscussionNotifier from './CaseDiscussionNotifier';
import { useAppContext } from '@/context/AppContext';

interface EnhancedCaseDiscussionProps {
  caseId: string;
}

/**
 * Wrapper component that adds notification functionality to CaseDiscussion
 * without modifying the original component
 */
const EnhancedCaseDiscussion: React.FC<EnhancedCaseDiscussionProps> = ({ caseId }) => {
  const { replies, refetchReplies } = useAppContext();
  
  // Load replies when the component mounts
  useEffect(() => {
    if (caseId) {
      refetchReplies(caseId);
    }
  }, [caseId, refetchReplies]);
  
  return (
    <>
      <CaseDiscussion caseId={caseId} />
      <CaseDiscussionNotifier caseId={caseId} replies={replies} />
    </>
  );
};

export default EnhancedCaseDiscussion;
