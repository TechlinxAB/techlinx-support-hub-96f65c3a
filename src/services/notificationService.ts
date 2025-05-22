
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Service for handling notifications
export const notificationService = {
  /**
   * Send a notification about a new reply
   * @param caseId The ID of the case
   * @param replyId The ID of the new reply
   * @param isUserReply Whether the reply was made by a regular user (not a consultant)
   */
  async sendReplyNotification(caseId: string, replyId: string, isUserReply: boolean): Promise<boolean> {
    try {
      // Get the case details to check priority
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('priority, title, status')
        .eq('id', caseId)
        .single();
        
      if (caseError) {
        console.error(`Error fetching case for notification: ${caseError.message}`);
        throw new Error(`Failed to fetch case: ${caseError.message}`);
      }
      
      const isHighPriority = caseData?.priority === 'high';
      console.log(`Sending notification for case ${caseId} - Priority: ${caseData?.priority}, High priority: ${isHighPriority}`);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`Error sending notification: ${sessionError.message}`);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error(`Error sending notification: Not authenticated - no session data`);
        throw new Error("Not authenticated");
      }
      
      // Determine recipient type based on who made the reply
      // If a user replied, notify consultants; if a consultant replied, notify the user
      const recipientType = isUserReply ? "consultant" : "user";
      console.log(`Notification recipient type: ${recipientType}, isUserReply: ${isUserReply}`);
      
      // Call the edge function directly with proper error handling
      try {
        // Get the API URL from environment or constants
        const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
        
        // Make sure we have a valid access token before proceeding
        if (!sessionData.session.access_token) {
          console.error("Error sending notification: No access token available");
          throw new Error("Authentication error: No access token");
        }
        
        console.log(`Calling edge function with caseId=${caseId}, replyId=${replyId}, recipientType=${recipientType}`);
        
        const response = await fetch(
          `${functionsUrl}/send-case-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              caseId,
              replyId,
              recipientType,
              skipEmail: false, // New option that allows skipping email sending but still logging the notification
            }),
            // Add timeout to prevent hanging on network issues
            signal: AbortSignal.timeout(15000) // 15 second timeout
          }
        );
        
        const responseData = await response.json().catch(() => ({ 
          error: `HTTP error ${response.status}`,
          warning: true
        }));
        
        // Check for warnings in the response (new feature)
        if (responseData.warning) {
          console.warn(`Notification warning: ${responseData.message || 'Unknown warning'}`);
          
          // Show a toast warning when notification has issues but didn't fail completely
          toast({
            title: "Notification delivery issue",
            description: responseData.message || "The notification may not have been delivered, but your reply was saved.",
            variant: "warning",
            duration: 5000,
          });
          
          // We still return true because the case/reply was successful
          return true;
        }
  
        // If there's an error in the response
        if (!response.ok || responseData.error) {
          console.error(`Error sending notification: ${JSON.stringify(responseData)}`);
          
          // Instead of throwing, just show a warning
          toast({
            title: "Notification delivery issue",
            description: "Your reply was saved, but email notifications couldn't be sent at this time.",
            variant: "warning",
            duration: 5000,
          });
          
          return true; // Still return success for the UI flow
        }
        
        // Success case - notification sent properly
        if (responseData.success && !responseData.debug) {
          const notificationType = isHighPriority ? 'high priority ' : '';
          toast({
            title: `Notification sent`,
            description: `Your reply was saved and ${notificationType}notification was sent.`,
            variant: "success",
          });
        } else if (responseData.debug) {
          // Debug mode - no emails actually sent
          toast.info(`Debug mode: No real email sent (${recipientType})`);
        }
        
        console.log(`Notification edge function response:`, responseData);
        return true;
      } catch (fetchError: any) {
        console.error(`Error sending notification: ${fetchError.message}`);
        
        // Handle network timeout specifically
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          toast.emailOffline({
            description: "The notification system is currently experiencing connectivity issues. Your reply was saved, but notifications couldn't be sent."
          });
        } else {
          // Display a toast warning when notification fails but don't prevent the UI from working
          toast({
            title: "Notification delivery issue",
            description: "Your reply was saved, but the notification delivery had an issue. The recipient may not be notified immediately.",
            variant: "warning",
            duration: 5000,
          });
        }
        
        // We return true here because the case/reply was successful even if notification had issues
        return true;
      }
      
    } catch (error: any) {
      console.error(`Error sending notification: ${error.message}`);
      
      // Even if notification fails, we don't want to block the UI
      toast({
        title: "Notification system issue",
        description: "Your action was completed successfully, but we couldn't send notifications at this time.",
        variant: "warning",
      });
      
      return false;
    }
  },
  
  /**
   * Send a notification for a new high priority case
   * @param caseId The ID of the case
   */
  async sendHighPriorityCaseNotification(caseId: string): Promise<boolean> {
    try {
      console.log(`Sending high priority case notification for case ${caseId}`);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`Error sending high priority notification: ${sessionError.message}`);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error(`Error sending high priority notification: Not authenticated - no session data`);
        throw new Error("Not authenticated");
      }
      
      // Get notification settings
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .single();
      
      if (settingsError) {
        console.error(`Error sending high priority notification: Failed to fetch notification settings - ${settingsError.message}`);
        throw new Error("Failed to fetch notification settings");
      }
      
      console.log(`High priority notification - settings: provider=${settings?.email_provider}, enable_priority=${settings?.enable_priority_notifications}, services_email=${settings?.services_email}`);
      
      // Skip if high priority notifications are disabled
      if (!settings.enable_priority_notifications) {
        console.log(`High priority notifications are disabled. Skipping.`);
        return false;
      }
      
      // Get the API URL from environment or constants
      const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
      
      // Call the notification edge function
      try {
        console.log(`Calling edge function for high priority case ${caseId}`);
        
        const response = await fetch(
          `${functionsUrl}/send-case-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              caseId,
              replyId: "",
              recipientType: "consultant", // High priority notifications go to consultants
              isHighPriority: true // Explicitly mark as high priority
            }),
            // Add timeout to prevent hanging on network issues
            signal: AbortSignal.timeout(15000) // 15 second timeout
          }
        );
        
        const responseData = await response.json().catch(() => ({ 
          error: `HTTP error ${response.status}`,
          warning: true  
        }));
        
        // Check for warnings in the response (new feature)
        if (responseData.warning) {
          console.warn(`High priority notification warning: ${responseData.message}`);
          
          // Show a toast warning when notification has issues
          toast({
            title: "High priority notification issue",
            description: responseData.message || "The case was created, but the priority notification delivery had an issue.",
            variant: "warning",
            duration: 5000,
          });
          
          // We still return true because the case creation was successful
          return true;
        }
        
        // If there's an error in the response
        if (!response.ok || responseData.error) {
          console.error(`Error sending high priority notification: ${JSON.stringify(responseData)}`);
          
          toast({
            title: "High priority notification issue",
            description: "The high priority case was created, but notification to consultants may not have been delivered.",
            variant: "warning",
            duration: 5000,
          });
          
          // Don't throw error, just return false
          return false;
        }
  
        // Handle success with proper messaging
        if (responseData.success && !responseData.debug) {
          toast({
            title: "High priority case created",
            description: "Consultants have been notified about this high priority case.",
            variant: "success",
          });
        } else if (responseData.debug) {
          // Debug mode - no emails sent
          toast.info("Debug mode: No real email sent for high priority notification");
        }
        
        console.log(`High priority notification response:`, responseData);
        return true;
      } catch (fetchError: any) {
        console.error(`Error sending high priority notification: ${fetchError.message}`);
        
        // Handle network timeout specifically
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          toast.emailOffline({
            description: "The notification system is currently experiencing connectivity issues. Your high priority case was created, but notifications couldn't be sent."
          });
        } else {
          // Show warning but don't block the UI
          toast({
            title: "High priority notification issue",
            description: "Your high priority case was created, but there was an issue notifying consultants.",
            variant: "warning",
            duration: 5000,
          });
        }
        
        return true; // We return true because the case creation was successful
      }
    } catch (error: any) {
      console.error(`Error in sendHighPriorityCaseNotification: ${error.message}`);
      return false;
    }
  },
  
  /**
   * Send a test email to verify email configuration
   * @param recipientEmail The email address to send the test to
   * @param highPriority Whether to send a high priority test email
   */
  async sendTestEmail(recipientEmail: string, highPriority: boolean = false): Promise<boolean> {
    try {
      // Get the session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`Error sending test email: Authentication error - ${sessionError.message}`);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error("Error sending test email: Not authenticated - no session data");
        throw new Error("Not authenticated");
      }
      
      // Call the edge function with proper error handling
      try {
        const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
        
        const response = await fetch(
          `${functionsUrl}/test-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              recipientEmail,
              highPriority,
              offlineMode: false, // New option, set to true to test without actually sending emails
            }),
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(15000)
          }
        );
  
        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          console.error(`Error sending test email: HTTP ${response.status} - ${JSON.stringify(errorData)}`);
          
          if (response.status === 502 || response.status === 504) {
            // Gateway timeout or Bad Gateway usually indicates SMTP connection issues
            toast.emailOffline({
              title: "Email Server Unreachable",
              description: "The email server is currently unreachable. Please check your SMTP settings or try again later."
            });
            return false;
          }
          
          throw new Error(errorData.error || `Failed to send test email (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        
        if (responseData.warning) {
          toast({
            title: "Test email issue",
            description: responseData.message || "There was an issue sending the test email.",
            variant: "warning"
          });
          return false;
        }
        
        toast({
          title: `${highPriority ? "High priority" : "Regular"} test email sent successfully`,
          description: `Email sent to ${recipientEmail}`,
          variant: "success"
        });
        
        return true;
      } catch (fetchError: any) {
        console.error(`Error sending test email: ${fetchError.message}`);
        
        // Handle network timeout specifically
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          toast.emailOffline({
            description: "The test email couldn't be sent due to a connection timeout. Please check your network and try again."
          });
        } else {
          throw new Error(`Test email service error: ${fetchError.message}`);
        }
        
        return false;
      }
    } catch (error: any) {
      console.error(`Error sending test email: ${error.message}`);
      
      toast({
        title: "Failed to send test email",
        description: error.message || "An error occurred while sending the test email",
        variant: "destructive"
      });
      
      return false;
    }
  },
  
  /**
   * Check if the notification system is operational
   * This is a lightweight check that doesn't actually send emails
   */
  async checkNotificationSystemStatus(): Promise<boolean> {
    try {
      // Get the session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`Error checking notification status: ${sessionError.message}`);
        return false;
      }
      
      if (!sessionData.session) {
        console.error("Error checking notification status: Not authenticated");
        return false;
      }
      
      // Get notification settings to check provider configuration
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('email_provider, smtp_host, smtp_port')
        .single();
      
      if (settingsError) {
        console.error(`Error checking notification settings: ${settingsError.message}`);
        return false;
      }
      
      // If no email provider is configured, the notification system is not operational
      if (settings.email_provider === 'none' || !settings.email_provider) {
        console.log("Notification system status: No email provider configured");
        return false;
      }
      
      // If using SMTP, check if the basic settings are there
      if (settings.email_provider === 'smtp' && (!settings.smtp_host || !settings.smtp_port)) {
        console.log("Notification system status: Incomplete SMTP configuration");
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error(`Error checking notification system status: ${error.message}`);
      return false;
    }
  }
};
