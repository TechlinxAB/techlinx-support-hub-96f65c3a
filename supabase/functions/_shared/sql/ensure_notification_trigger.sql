
-- Check if the trigger exists and create it if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'replies' AND pg_trigger.tgname = 'handle_new_reply_trigger'
  ) THEN
    -- Create the trigger on the replies table
    CREATE TRIGGER handle_new_reply_trigger
    AFTER INSERT ON public.replies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_reply();
    
    RAISE NOTICE 'Created handle_new_reply_trigger on replies table';
  ELSE
    RAISE NOTICE 'The handle_new_reply_trigger already exists';
  END IF;
  
  -- Create a trigger for new high priority cases if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'cases' AND pg_trigger.tgname = 'handle_high_priority_case_trigger'
  ) THEN
    -- Create the function for handling high priority cases
    CREATE OR REPLACE FUNCTION public.handle_high_priority_case()
    RETURNS TRIGGER AS $$
    DECLARE
      notification_settings_record RECORD;
      response_status INTEGER;
      response_body TEXT;
      headers JSONB;
      supabase_url TEXT;
      auth_token TEXT;
    BEGIN
      -- Only proceed if this is a high priority case
      IF NEW.priority = 'high' THEN
        -- Log the high priority case detection
        RAISE LOG 'High priority case detected: %', NEW.id;
        
        -- Get notification settings to check if high priority notifications are enabled
        SELECT * INTO notification_settings_record 
        FROM public.notification_settings 
        LIMIT 1;
        
        IF notification_settings_record.enable_priority_notifications = true THEN
          -- Attempt to call the edge function to send notification
          -- In a real implementation we'd call the edge function here
          -- For now we just log that we would have called it
          RAISE LOG 'Would call notification for high priority case: %', NEW.id;
        ELSE
          RAISE LOG 'High priority notifications disabled for case: %', NEW.id;
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Create the trigger
    CREATE TRIGGER handle_high_priority_case_trigger
    AFTER INSERT ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_high_priority_case();
    
    RAISE NOTICE 'Created handle_high_priority_case_trigger on cases table';
  ELSE
    RAISE NOTICE 'The handle_high_priority_case_trigger already exists';
  END IF;
END $$;
