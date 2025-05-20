
import { supabase } from "@/integrations/supabase/client";
import { Reply } from "@/context/AppContext";
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
      console.log(`[NotificationService] Starting notification process for reply ${replyId} in case ${caseId}`);
      console.log(`[NotificationService] Is user reply: ${isUserReply}`);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[NotificationService] Authentication error:`, sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        console.error(`[NotificationService] Not authenticated - no session data`);
        throw new Error("Not authenticated");
      }
      
      console.log(`[NotificationService] Authenticated as ${sessionData.session.user.email}`);
      
      // Determine recipient type based on who made the reply
      // If a user replied, notify consultants; if a consultant replied, notify the user
      const recipientType = isUserReply ? "consultant" : "user";
      
      console.log(`[NotificationService] Recipient type: ${recipientType}`);
      
      // Get notification settings to check if we have email configured
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .single();
      
      if (settingsError) {
        console.error("[NotificationService] Error fetching notification settings:", settingsError);
        throw new Error("Failed to fetch notification settings");
      }
      
      console.log(`[NotificationService] Retrieved notification settings:`, {
        smtpConfigured: !!settings.smtp_host,
        smtpHost: settings.smtp_host,
        smtpPort: settings.smtp_port,
        servicesEmail: settings.services_email,
        hasSmtpUser: !!settings.smtp_user,
        hasSmtpPassword: !!settings.smtp_password,
        senderEmail: settings.sender_email,
        senderName: settings.sender_name
      });
      
      const emailConfigured = settings?.smtp_host && settings?.smtp_user && settings?.smtp_password;
      
      if (!emailConfigured) {
        console.warn(`[NotificationService] Email is not fully configured. Missing required SMTP settings.`);
      }
      
      // Call the edge function with proper error handling
      try {
        // Get the API URL from environment or constants
        // The edge function URL should include the Supabase project ID
        const functionsUrl = "https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1";
        
        console.log(`[NotificationService] Calling edge function at ${functionsUrl}/send-case-notification`);
        console.log(`[NotificationService] Payload:`, {
          caseId,
          replyId,
          recipientType
        });
        
        // Make sure we have a valid access token before proceeding
        if (!sessionData.session.access_token) {
          console.error("[NotificationService] No access token available");
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
  
        console.log(`[NotificationService] Edge function response status: ${response.status}`);
        
        // Check for HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          console.error(`[NotificationService] Edge function error:`, errorData);
          throw new Error(errorData.error || `Failed to send notification (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        console.log("[NotificationService] Edge function response:", responseData);
        
        // Show success toast
        if (emailConfigured) {
          toast.success(`Email notification sent to ${recipientType}`, {
            description: "Email notification delivered successfully"
          });
        } else {
          toast.success(`Notification for ${recipientType} logged`, {
            description: "Email notifications not configured - check Settings to enable"
          });
        }
        
        return true;
      } catch (fetchError) {
        console.error("[NotificationService] Error calling notification function:", fetchError);
        throw new Error(`Failed to call notification service: ${fetchError.message}`);
      }
      
    } catch (error) {
      console.error("[NotificationService] Error sending notification:", error);
      
      // Show error toast
      toast.error("Failed to send notification", {
        description: error.message || "An error occurred while sending the notification"
      });
      
      return false;
    }
  },
  
  /**
   * Send a test email to verify email configuration
   * @param recipientEmail The email address to send the test to
   */
  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      // Get the session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }
      
      console.log("Sending test email to:", recipientEmail);
      
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
            }),
          }
        );
  
        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
          throw new Error(errorData.error || `Failed to send test email (HTTP ${response.status})`);
        }
  
        const responseData = await response.json();
        
        console.log("Test email response:", responseData);
        
        toast.success("Test email sent successfully", {
          description: `Email sent to ${recipientEmail}`
        });
        
        return true;
      } catch (fetchError) {
        console.error("Error calling test email function:", fetchError);
        throw new Error(`Test email service error: ${fetchError.message}`);
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      
      toast.error("Failed to send test email", {
        description: error.message || "An error occurred while sending the test email"
      });
      
      return false;
    }
  }
};
