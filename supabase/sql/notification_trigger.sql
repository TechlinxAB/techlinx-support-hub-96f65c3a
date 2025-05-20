
-- Create a function that can be called to install or update the notification trigger
CREATE OR REPLACE FUNCTION public.install_notification_trigger()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  -- Enable the pg_net extension if it's not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_net;
  
  -- Create a function that will be triggered when a new reply is added
  CREATE OR REPLACE FUNCTION public.handle_new_reply() 
  RETURNS trigger AS $inner$
  DECLARE
    reply_author_role text;
    notification_recipient_type text;
    db_response json;
  BEGIN
    -- Get the role of the user who created the reply
    SELECT role INTO reply_author_role 
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    -- Determine notification recipient type based on the reply author's role
    IF reply_author_role = 'consultant' THEN
      notification_recipient_type := 'user';
    ELSE
      notification_recipient_type := 'consultant';
    END IF;

    RAISE LOG 'Reply trigger fired. Reply ID: %, Author role: %, Recipient type: %, Internal reply: %', 
      NEW.id, reply_author_role, notification_recipient_type, NEW.is_internal;

    -- Skip sending notification for internal replies to users
    IF NEW.is_internal = true AND notification_recipient_type = 'user' THEN
      RAISE LOG 'Skipping notification for internal reply to user';
      RETURN NEW;
    END IF;

    -- Call the edge function to send notification
    BEGIN
      SELECT 
        content::json INTO db_response
      FROM
        pg_net.http_post(
          url := 'https://uaoeabhtbynyfzyfzogp.supabase.co/functions/v1/send-case-notification',
          body := jsonb_build_object(
            'caseId', NEW.case_id,
            'replyId', NEW.id,
            'recipientType', notification_recipient_type
          ),
          headers := '{"Content-Type": "application/json"}'
        );
      
      RAISE LOG 'Notification API response: %', db_response;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error calling notification API: %', SQLERRM;
    END;
    
    RETURN NEW;
  END;
  $inner$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Add explicit index on case_id for performance
  CREATE INDEX IF NOT EXISTS idx_replies_case_id ON public.replies(case_id);
  
  -- Drop the trigger if it exists and recreate it
  DROP TRIGGER IF EXISTS on_reply_created ON public.replies;
  
  -- Create the trigger
  CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_reply();
  
  result := 'Notification trigger installed successfully';
  RAISE LOG '%', result;
  RETURN result;
END;
$$;

-- Run the function to install the trigger immediately
SELECT public.install_notification_trigger();
