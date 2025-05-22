
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
    -- Original SMTP fields
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
    
    -- New high priority notification fields
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'enable_priority_notifications') THEN
      ALTER TABLE public.notification_settings ADD COLUMN enable_priority_notifications BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'high_priority_color') THEN
      ALTER TABLE public.notification_settings ADD COLUMN high_priority_color VARCHAR(20) DEFAULT '#ffebeb';
    END IF;
    
    -- Ensure high priority notification template exists
    INSERT INTO public.notification_templates (type, subject, body)
    VALUES (
      'high_priority_notification', 
      'URGENT: High Priority Case {case_title}', 
      'URGENT: A high priority case {case_title} has been created and requires immediate attention. You can view and respond to this case by following this link: {case_link}'
    )
    ON CONFLICT (type) DO NOTHING;
    
  END $$;
  `;
  
  // Run the SQL
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error("Error adding notification fields:", error);
    throw error;
  }
  
  return { success: true };
}
