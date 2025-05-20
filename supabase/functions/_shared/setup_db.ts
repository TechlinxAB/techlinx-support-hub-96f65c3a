
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

export async function ensureSmtpFieldsExist() {
  // Create Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // SQL to add SMTP fields if they don't exist
  const sql = `
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'smtp_host') THEN
      ALTER TABLE public.notification_settings ADD COLUMN smtp_host TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'smtp_port') THEN
      ALTER TABLE public.notification_settings ADD COLUMN smtp_port INTEGER DEFAULT 587;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'smtp_user') THEN
      ALTER TABLE public.notification_settings ADD COLUMN smtp_user TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'smtp_password') THEN
      ALTER TABLE public.notification_settings ADD COLUMN smtp_password TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'smtp_secure') THEN
      ALTER TABLE public.notification_settings ADD COLUMN smtp_secure BOOLEAN DEFAULT false;
    END IF;
  END $$;
  `;
  
  // Run the SQL
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error("Error adding SMTP fields:", error);
    throw error;
  }
  
  return { success: true };
}
