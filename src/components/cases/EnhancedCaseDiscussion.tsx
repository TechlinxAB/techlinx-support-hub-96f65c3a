
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
  
  // Load replies when the component mounts or caseId changes
  useEffect(() => {
    if (caseId) {
      console.log(`[EnhancedCaseDiscussion] Loading replies for case ${caseId}`);
      refetchReplies(caseId);
    }
    
    // Set up polling for new replies
    const intervalId = setInterval(() => {
      if (caseId) {
        console.log(`[EnhancedCaseDiscussion] Polling for new replies for case ${caseId}`);
        refetchReplies(caseId);
      }
    }, 30000); // Poll every 30 seconds
    
    return () => {
      console.log(`[EnhancedCaseDiscussion] Cleaning up polling for case ${caseId}`);
      clearInterval(intervalId);
    };
  }, [caseId, refetchReplies]);
  
  console.log(`[EnhancedCaseDiscussion] Current replies count: ${replies?.length || 0}`);
  
  return (
    <>
      <CaseDiscussion caseId={caseId} />
      <CaseDiscussionNotifier caseId={caseId} replies={replies} />
    </>
  );
};

export default EnhancedCaseDiscussion;
