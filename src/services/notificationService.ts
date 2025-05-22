
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
      
      // Get notification settings to check if we have email configured
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .single();
      
      if (settingsError) {
        console.error(`Error sending notification: Failed to fetch notification settings - ${settingsError.message}`);
        throw new Error("Failed to fetch notification settings");
      }
      
      const emailConfigured = settings?.smtp_host && settings?.smtp_user && settings?.smtp_password;
      
      // Call the edge function with proper error handling
      try {
        // Get the API URL from environment or constants
        const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
        
        // Make sure we have a valid access token before proceeding
        if (!sessionData.session.access_token) {
          console.error("Error sending notification: No access token available");
          throw new Error("Authentication error: No access token");
        }
        
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
          console.error(`Error sending notification: ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || `Failed to send notification (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        
        return true;
      } catch (fetchError: any) {
        console.error(`Error sending notification: ${fetchError.message}`);
        throw new Error(`Failed to call notification service: ${fetchError.message}`);
      }
      
    } catch (error: any) {
      console.error(`Error sending notification: ${error.message}`);
      
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
