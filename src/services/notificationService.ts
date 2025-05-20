
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
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }
      
      // Determine recipient type based on who made the reply
      // If a user replied, notify consultants; if a consultant replied, notify the user
      const recipientType = isUserReply ? "consultant" : "user";
      
      // Get notification settings to check if we have email configured
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('email_provider')
        .single();
      
      const emailConfigured = settings?.email_provider === 'resend';
      
      const response = await fetch(
        `https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1/send-case-notification`,
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send notification");
      }

      const responseData = await response.json();
      
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
    } catch (error) {
      console.error("Error sending notification:", error);
      
      // Show error toast
      toast.error("Failed to send notification", {
        description: error.message || "An error occurred while sending the notification"
      });
      
      return false;
    }
  }
};
