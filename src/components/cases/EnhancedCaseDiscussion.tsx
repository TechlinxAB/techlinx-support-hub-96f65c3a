
import React from 'react';
import CaseDiscussion from './CaseDiscussion'; // Import the original component
import { useAppContext } from '@/context/AppContext';

interface EnhancedCaseDiscussionProps {
  caseId: string;
}

/**
 * Wrapper component for CaseDiscussion that adds enhanced functionality
 * without modifying the original component
 */
const EnhancedCaseDiscussion: React.FC<EnhancedCaseDiscussionProps> = ({ caseId }) => {
  const { replies, users } = useAppContext();
  
  // Add user role to each reply
  const repliesWithRole = replies?.map(reply => {
    const user = users.find(u => u.id === reply.userId);
    return {
      ...reply,
      userRole: user?.role || 'user'
    };
  }) || [];
  
  return (
    <>
      <CaseDiscussion caseId={caseId} />
    </>
  );
};

export default EnhancedCaseDiscussion;
