
import React, { useEffect, useState } from 'react';
import CaseDiscussion from './CaseDiscussion'; // Import the original component
import CaseDiscussionNotifier from './CaseDiscussionNotifier';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedCaseDiscussionProps {
  caseId: string;
}

/**
 * Wrapper component that adds notification functionality to CaseDiscussion
 * without modifying the original component
 */
const EnhancedCaseDiscussion: React.FC<EnhancedCaseDiscussionProps> = ({ caseId }) => {
  const { replies, refetchReplies, users } = useAppContext();
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [notificationServiceStatus, setNotificationServiceStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  
  // Enhanced logging for debugging
  console.log(`[EnhancedCaseDiscussion] Initializing for case ${caseId}`);
  console.log(`[EnhancedCaseDiscussion] Current replies count: ${replies?.length || 0}`);
  
  if (replies && replies.length > 0) {
    console.log(`[EnhancedCaseDiscussion] Latest reply: ${replies[replies.length - 1].id}, created at: ${new Date(replies[replies.length - 1].createdAt).toISOString()}`);
  }
  
  // Check notification trigger status on mount
  useEffect(() => {
    const checkNotificationSystem = async () => {
      try {
        // Check if the notification trigger is properly installed using our existing function
        const { data, error } = await supabase.rpc('check_notification_trigger_status');
        
        if (error) {
          console.error('[EnhancedCaseDiscussion] Error checking notification trigger:', error);
          setNotificationServiceStatus('error');
          return;
        }
        
        if (data && data.length > 0) {
          console.log('[EnhancedCaseDiscussion] Notification trigger status:', data);
          const trigger = data[0];
          
          if (trigger.is_active) {
            console.log('[EnhancedCaseDiscussion] Notification trigger is active');
            setNotificationServiceStatus('ok');
          } else {
            console.warn('[EnhancedCaseDiscussion] Notification trigger exists but is not active');
            setNotificationServiceStatus('error');
          }
        } else {
          console.error('[EnhancedCaseDiscussion] Notification trigger not found');
          setNotificationServiceStatus('error');
        }
      } catch (err) {
        console.error('[EnhancedCaseDiscussion] Exception checking notification trigger:', err);
        setNotificationServiceStatus('error');
      }
    };
    
    checkNotificationSystem();
  }, []);
  
  // Notify user about notification service status
  useEffect(() => {
    if (notificationServiceStatus === 'error') {
      toast.error('Notification service might not be working correctly', {
        description: 'System administrators have been notified.',
        duration: 5000,
      });
      
      // Could add here a call to report the issue to admins
    }
  }, [notificationServiceStatus]);
  
  // Load replies when the component mounts or caseId changes
  useEffect(() => {
    if (caseId) {
      console.log(`[EnhancedCaseDiscussion] Loading replies for case ${caseId}`);
      
      refetchReplies(caseId)
        .then(() => {
          setLastFetchTime(new Date());
          console.log(`[EnhancedCaseDiscussion] Successfully fetched replies at ${new Date().toISOString()}`);
        })
        .catch(error => {
          console.error(`[EnhancedCaseDiscussion] Error fetching replies:`, error);
        });
    }
    
    // Set up polling for new replies
    const intervalId = setInterval(() => {
      if (caseId) {
        console.log(`[EnhancedCaseDiscussion] Polling for new replies for case ${caseId}`);
        
        refetchReplies(caseId)
          .then(() => {
            setLastFetchTime(new Date());
            console.log(`[EnhancedCaseDiscussion] Successfully polled for replies at ${new Date().toISOString()}`);
          })
          .catch(error => {
            console.error(`[EnhancedCaseDiscussion] Error polling for replies:`, error);
          });
      }
    }, 30000); // Poll every 30 seconds
    
    return () => {
      console.log(`[EnhancedCaseDiscussion] Cleaning up polling for case ${caseId}`);
      clearInterval(intervalId);
    };
  }, [caseId, refetchReplies]);
  
  // Add user role to each reply
  const repliesWithRole = replies?.map(reply => {
    const user = users.find(u => u.id === reply.userId);
    return {
      ...reply,
      userRole: user?.role || 'user'
    };
  }) || [];
  
  // Check if we can manually test the notification
  const testNotification = async () => {
    try {
      console.log('[EnhancedCaseDiscussion] Testing notification system');
      
      const { data, error } = await supabase.rpc('test_notification_system', {
        case_id: caseId
      });
      
      if (error) {
        console.error('[EnhancedCaseDiscussion] Error testing notification:', error);
        toast.error('Failed to test notification system', {
          description: error.message,
        });
        return;
      }
      
      console.log('[EnhancedCaseDiscussion] Test notification result:', data);
      toast.success('Notification test initiated', {
        description: 'Check server logs for results',
      });
    } catch (err) {
      console.error('[EnhancedCaseDiscussion] Exception testing notification:', err);
      toast.error('Exception testing notification system');
    }
  };
  
  // This function is only for development/debugging and can be removed in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[EnhancedCaseDiscussion] Development mode - Test notification function available');
    (window as any).testCaseNotification = testNotification;
    (window as any).checkReplies = () => console.log('Current replies:', replies);
  }
  
  return (
    <>
      <CaseDiscussion caseId={caseId} />
      <CaseDiscussionNotifier caseId={caseId} replies={repliesWithRole} />
    </>
  );
};

export default EnhancedCaseDiscussion;
