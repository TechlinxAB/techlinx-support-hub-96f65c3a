
import { supabase } from "@/integrations/supabase/client";

// Service for database maintenance operations
export const databaseService = {
  /**
   * Initialize database components like triggers
   * This should be called when the app starts
   */
  async initialize(): Promise<boolean> {
    try {
      console.log("[DatabaseService] Initializing database components");
      
      // Ensure notification trigger is installed
      const result = await this.ensureNotificationTrigger();
      
      console.log("[DatabaseService] Database initialization completed", result);
      return true;
    } catch (error) {
      console.error("[DatabaseService] Error initializing database:", error);
      return false;
    }
  },
  
  /**
   * Ensure the notification trigger is properly installed
   */
  async ensureNotificationTrigger(): Promise<boolean> {
    try {
      console.log("[DatabaseService] Installing notification trigger");
      
      // Call the RPC function to ensure trigger installation
      const { data, error } = await supabase.rpc('install_notification_trigger');
      
      if (error) {
        console.error("[DatabaseService] Error installing trigger:", error);
        return false;
      }
      
      console.log("[DatabaseService] Trigger installation result:", data);
      return true;
    } catch (error) {
      console.error("[DatabaseService] Error ensuring trigger:", error);
      return false;
    }
  }
};
