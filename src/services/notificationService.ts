
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        .select('priority')
        .eq('id', caseId)
        .single();
        
      if (caseError) {
        console.error(`Error fetching case for notification: ${caseError.message}`);
        throw new Error(`Failed to fetch case: ${caseError.message}`);
      }
      
      const isHighPriority = caseData?.priority === 'high';
      console.log(`[HIGH PRIORITY DEBUG] Case ${caseId} - Priority: ${caseData?.priority}, High priority: ${isHighPriority}`);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending notification: ${sessionError.message}`);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending notification: Not authenticated - no session data`);
        throw new Error("Not authenticated");
      }
      
      // Determine recipient type based on who made the reply
      // If a user replied, notify consultants; if a consultant replied, notify the user
      const recipientType = isUserReply ? "consultant" : "user";
      console.log(`[HIGH PRIORITY DEBUG] Notification recipient type: ${recipientType}, isUserReply: ${isUserReply}`);
      
      // Get notification settings to check if we have email configured
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .single();
      
      if (settingsError) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending notification: Failed to fetch notification settings - ${settingsError.message}`);
        throw new Error("Failed to fetch notification settings");
      }
      
      console.log(`[HIGH PRIORITY DEBUG] Notification settings: provider=${settings?.email_provider}, enable_priority=${settings?.enable_priority_notifications}, services_email=${settings?.services_email}`);
      
      const emailConfigured = settings?.smtp_host && settings?.smtp_user && settings?.smtp_password;
      console.log(`[HIGH PRIORITY DEBUG] Email configured: ${emailConfigured ? 'Yes' : 'No'}`);
      
      // Call the edge function with proper error handling
      try {
        // Get the API URL from environment or constants
        const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
        
        // Make sure we have a valid access token before proceeding
        if (!sessionData.session.access_token) {
          console.error("[HIGH PRIORITY DEBUG] Error sending notification: No access token available");
          throw new Error("Authentication error: No access token");
        }
        
        console.log(`[HIGH PRIORITY DEBUG] Calling edge function with caseId=${caseId}, replyId=${replyId}, recipientType=${recipientType}`);
        
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
            }),
          }
        );
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          console.error(`[HIGH PRIORITY DEBUG] Error sending notification: ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || `Failed to send notification (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        console.log(`[HIGH PRIORITY DEBUG] Notification edge function response:`, responseData);
        
        return true;
      } catch (fetchError: any) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending notification: ${fetchError.message}`);
        throw new Error(`Failed to call notification service: ${fetchError.message}`);
      }
      
    } catch (error: any) {
      console.error(`[HIGH PRIORITY DEBUG] Error sending notification: ${error.message}`);
      
      return false;
    }
  },
  
  /**
   * Send a notification for a new high priority case
   * @param caseId The ID of the case
   */
  async sendHighPriorityCaseNotification(caseId: string): Promise<boolean> {
    try {
      console.log(`[HIGH PRIORITY DEBUG] Sending high priority case notification for case ${caseId}`);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending high priority notification: ${sessionError.message}`);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending high priority notification: Not authenticated - no session data`);
        throw new Error("Not authenticated");
      }
      
      // Get notification settings
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .single();
      
      if (settingsError) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending high priority notification: Failed to fetch notification settings - ${settingsError.message}`);
        throw new Error("Failed to fetch notification settings");
      }
      
      console.log(`[HIGH PRIORITY DEBUG] High priority notification - settings: provider=${settings?.email_provider}, enable_priority=${settings?.enable_priority_notifications}, services_email=${settings?.services_email}`);
      
      // Skip if high priority notifications are disabled
      if (!settings.enable_priority_notifications) {
        console.log(`[HIGH PRIORITY DEBUG] High priority notifications are disabled. Skipping.`);
        return false;
      }
      
      // Get the API URL from environment or constants
      const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
      
      // Call the notification edge function
      try {
        console.log(`[HIGH PRIORITY DEBUG] Calling edge function for high priority case ${caseId}`);
        
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
            }),
          }
        );
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          console.error(`[HIGH PRIORITY DEBUG] Error sending high priority notification: ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || `Failed to send high priority notification (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        console.log(`[HIGH PRIORITY DEBUG] High priority notification response:`, responseData);
        
        return true;
      } catch (fetchError: any) {
        console.error(`[HIGH PRIORITY DEBUG] Error sending high priority notification: ${fetchError.message}`);
        throw new Error(`Failed to call notification service: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error(`[HIGH PRIORITY DEBUG] Error in sendHighPriorityCaseNotification: ${error.message}`);
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
              highPriority
            }),
          }
        );
  
        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          console.error(`Error sending test email: HTTP ${response.status} - ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || `Failed to send test email (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        
        toast.success(`${highPriority ? "High priority" : "Regular"} test email sent successfully`, {
          description: `Email sent to ${recipientEmail}`
        });
        
        return true;
      } catch (fetchError: any) {
        console.error(`Error sending test email: ${fetchError.message}`);
        throw new Error(`Test email service error: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error(`Error sending test email: ${error.message}`);
      
      toast.error("Failed to send test email", {
        description: error.message || "An error occurred while sending the test email"
      });
      
      return false;
    }
  }
};
