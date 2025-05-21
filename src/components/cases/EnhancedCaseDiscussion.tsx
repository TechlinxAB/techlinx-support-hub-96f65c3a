
import React, { useEffect, useState } from 'react';
import CaseDiscussion from './CaseDiscussion'; // Import the original component
import CaseDiscussionNotifier from './CaseDiscussionNotifier';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [notificationServiceStatus, setNotificationServiceStatus] = useState<'checking' | 'ok' | 'error' | 'pgnet_missing' | 'pgnet_function_missing'>('checking');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
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
        // Check pg_net availability using our new function
        const { data: pgNetData, error: pgNetError } = await supabase.rpc('check_pg_net_availability');
        
        if (pgNetError) {
          console.error('[EnhancedCaseDiscussion] Error checking pg_net availability:', pgNetError);
          setNotificationServiceStatus('error');
          setDiagnosticInfo({
            error: pgNetError.message,
            details: "Error while checking pg_net availability",
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        console.log('[EnhancedCaseDiscussion] pg_net diagnostic info:', pgNetData);
        setDiagnosticInfo(pgNetData);
        
        if (!pgNetData.extension_installed) {
          console.error('[EnhancedCaseDiscussion] pg_net extension is not available');
          setNotificationServiceStatus('pgnet_missing');
          return;
        }
        
        if (!pgNetData.http_post_function_exists) {
          console.error('[EnhancedCaseDiscussion] pg_net extension installed but http_post function not found');
          setNotificationServiceStatus('pgnet_function_missing');
          return;
        }
        
        // Now perform an explicit test of the HTTP functionality
        console.log('[EnhancedCaseDiscussion] Testing HTTP request capability');
        const { data: httpTest, error: httpTestError } = await supabase.rpc('test_http_request');
        
        if (httpTestError) {
          console.error('[EnhancedCaseDiscussion] Error testing HTTP request capability:', httpTestError);
          setDiagnosticInfo(prev => ({
            ...prev,
            http_test_error: httpTestError.message,
            http_test_timestamp: new Date().toISOString()
          }));
          setNotificationServiceStatus('error');
          return;
        }
        
        console.log('[EnhancedCaseDiscussion] HTTP request test result:', httpTest);
        setDiagnosticInfo(prev => ({
          ...prev,
          http_test_result: httpTest,
          http_test_timestamp: new Date().toISOString()
        }));
        
        if (!httpTest.success) {
          console.error('[EnhancedCaseDiscussion] HTTP request test failed:', httpTest.error);
          setNotificationServiceStatus('error');
          return;
        }
        
        // Now check if the notification trigger is properly installed
        const { data, error } = await supabase.rpc('check_notification_trigger_status');
        
        if (error) {
          console.error('[EnhancedCaseDiscussion] Error checking notification trigger:', error);
          setDiagnosticInfo(prev => ({
            ...prev,
            trigger_check_error: error.message,
            trigger_check_timestamp: new Date().toISOString()
          }));
          setNotificationServiceStatus('error');
          return;
        }
        
        if (data && data.length > 0) {
          console.log('[EnhancedCaseDiscussion] Notification trigger status:', data);
          setDiagnosticInfo(prev => ({
            ...prev,
            trigger_status: data,
            trigger_check_timestamp: new Date().toISOString()
          }));
          
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
          setDiagnosticInfo(prev => ({
            ...prev,
            trigger_missing: true,
            trigger_check_timestamp: new Date().toISOString()
          }));
          setNotificationServiceStatus('error');
        }
      } catch (err) {
        console.error('[EnhancedCaseDiscussion] Exception checking notification trigger:', err);
        setDiagnosticInfo({
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        setNotificationServiceStatus('error');
      }
    };
    
    checkNotificationSystem();
  }, []);
  
  // Notify user about notification service status
  useEffect(() => {
    if (notificationServiceStatus === 'error') {
      toast.error('Notification service might not be working correctly', {
        description: 'System administrators have been notified. Check console for details.',
        duration: 5000,
      });
    } else if (notificationServiceStatus === 'pgnet_missing') {
      toast.error('Email notification system unavailable', {
        description: 'The database extension required for email notifications is not enabled. Please contact system administrators.',
        duration: 8000,
      });
      
      console.error('[EnhancedCaseDiscussion] Critical: pg_net extension is not available. Email notifications will not work.');
    } else if (notificationServiceStatus === 'pgnet_function_missing') {
      toast.error('Email notification system configuration issue', {
        description: 'The pg_net extension is enabled but the HTTP functions are not available. Please contact system administrators.',
        duration: 8000,
      });
      
      console.error('[EnhancedCaseDiscussion] Critical: pg_net extension is available but HTTP functions are missing.');
    } else if (notificationServiceStatus === 'ok') {
      console.log('[EnhancedCaseDiscussion] Notification system is properly configured and active');
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
  
  // Test notification function for debugging
  const testNotification = async () => {
    try {
      console.log('[EnhancedCaseDiscussion] Testing notification system');
      toast.info('Testing notification system...', {
        description: 'Attempting to verify notification system functionality',
        duration: 3000,
      });
      
      // First get detailed pg_net information for debugging
      const { data: pgNetDiag, error: pgNetDiagError } = await supabase.rpc('check_pg_net_availability');
      if (!pgNetDiagError) {
        console.log('[EnhancedCaseDiscussion] Current pg_net status:', pgNetDiag);
        setDiagnosticInfo(prev => ({
          ...prev,
          pg_net_status: pgNetDiag,
          test_timestamp: new Date().toISOString()
        }));
      } else {
        setDiagnosticInfo(prev => ({
          ...prev,
          pg_net_check_error: pgNetDiagError.message,
          test_timestamp: new Date().toISOString()
        }));
      }
      
      // Use the test HTTP request function to validate basic connectivity
      const { data: httpTest, error: httpTestError } = await supabase.rpc('test_http_request');
      if (!httpTestError) {
        console.log('[EnhancedCaseDiscussion] HTTP test result:', httpTest);
        setDiagnosticInfo(prev => ({
          ...prev,
          http_test: httpTest,
          test_timestamp: new Date().toISOString()
        }));
      } else {
        setDiagnosticInfo(prev => ({
          ...prev,
          http_test_error: httpTestError.message,
          test_timestamp: new Date().toISOString()
        }));
      }
      
      // Call the specific notification test function
      const { data, error } = await supabase.rpc('test_notification_system', {
        case_id: caseId
      });
      
      if (error) {
        console.error('[EnhancedCaseDiscussion] Error testing notification:', error);
        toast.error('Failed to test notification system', {
          description: error.message,
        });
        
        setDiagnosticInfo(prev => ({
          ...prev,
          notification_test_error: error.message,
          test_timestamp: new Date().toISOString()
        }));
        
        return;
      }
      
      console.log('[EnhancedCaseDiscussion] Test notification result:', data);
      setDiagnosticInfo(prev => ({
        ...prev,
        notification_test_result: data,
        test_timestamp: new Date().toISOString()
      }));
      
      // Check if the result indicates success
      toast.success('Notification test initiated', {
        description: 'Check server logs for results',
      });
      
    } catch (err) {
      console.error('[EnhancedCaseDiscussion] Exception testing notification:', err);
      toast.error('Exception testing notification system');
      setDiagnosticInfo(prev => ({
        ...prev,
        test_exception: err.message,
        test_stack: err.stack,
        test_timestamp: new Date().toISOString()
      }));
    }
    
    setShowDiagnostics(true);
  };
  
  // This function is only for development/debugging and can be removed in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[EnhancedCaseDiscussion] Development mode - Test notification function available');
    (window as any).testCaseNotification = testNotification;
    (window as any).checkReplies = () => console.log('Current replies:', replies);
    (window as any).getNotificationStatus = () => console.log('Notification status:', notificationServiceStatus);
    (window as any).getDiagnosticInfo = () => console.log('Diagnostic info:', diagnosticInfo);
  }
  
  return (
    <>
      {notificationServiceStatus !== 'checking' && notificationServiceStatus !== 'ok' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notification System Issue</AlertTitle>
          <AlertDescription>
            {notificationServiceStatus === 'pgnet_missing' && (
              <span>The database extension for email notifications (pg_net) is not enabled. Please contact system administrators.</span>
            )}
            {notificationServiceStatus === 'pgnet_function_missing' && (
              <span>The pg_net extension is enabled but the HTTP functions are not available. This may require a database restart. Please contact system administrators.</span>
            )}
            {notificationServiceStatus === 'error' && (
              <span>There is a problem with the notification system. Technical staff have been notified.</span>
            )}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDiagnostics(!showDiagnostics)}>
                {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
              </Button>
              {' '}
              <Button variant="outline" size="sm" onClick={testNotification}>
                Run Diagnostics
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {showDiagnostics && diagnosticInfo && (
        <Alert variant="default" className="mb-4 bg-slate-50">
          <Info className="h-4 w-4" />
          <AlertTitle>Notification System Diagnostics</AlertTitle>
          <AlertDescription>
            <pre className="text-xs mt-2 p-2 bg-slate-100 rounded overflow-auto max-h-40">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </AlertDescription>
        </Alert>
      )}
      
      <CaseDiscussion caseId={caseId} />
      <CaseDiscussionNotifier caseId={caseId} replies={repliesWithRole} />
    </>
  );
};

export default EnhancedCaseDiscussion;
