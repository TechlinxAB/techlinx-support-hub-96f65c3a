
-- Add SMTP fields to notification_settings table if they don't exist
DO $$ 
BEGIN
  -- SMTP Configuration
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
  
  -- High Priority Notification Settings
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'enable_priority_notifications') THEN
    ALTER TABLE public.notification_settings ADD COLUMN enable_priority_notifications BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'high_priority_color') THEN
    ALTER TABLE public.notification_settings ADD COLUMN high_priority_color VARCHAR(20) DEFAULT '#ffebeb';
  END IF;
END $$;
