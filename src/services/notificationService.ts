
import { supabase } from "@/integrations/supabase/client";
import { Reply } from "@/context/AppContext";
import { toast } from "sonner";

// The URL for the Supabase Edge Function
const SUPABASE_URL = "https://uaoeabhtbynyfzyfzogp.supabase.co";

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
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-case-notification`,
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

      // Show success toast
      toast.success(`Notification sent to ${recipientType}`, {
        description: "Email notification was triggered successfully"
      });
      
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
