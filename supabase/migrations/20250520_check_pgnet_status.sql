
-- Function to check if pg_net extension exists and is properly installed
-- and provides more detailed diagnostic information
CREATE OR REPLACE FUNCTION public.check_pgnet_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  extension_status boolean;
  function_exists boolean;
  test_result text;
  result jsonb;
BEGIN
  -- Check if extension exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_net'
  ) INTO extension_status;

  -- Check if the function exists (with correct namespace)
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname || '.' || p.proname = 'net.http_post'
  ) INTO function_exists;
  
  -- Try to execute a simple test call with error catching
  BEGIN
    SELECT net.http_get('https://httpbin.org/get') INTO test_result;
    EXCEPTION WHEN OTHERS THEN
      test_result := 'Error: ' || SQLERRM;
  END;
  
  -- Build detailed result
  result := jsonb_build_object(
    'extension_installed', extension_status,
    'http_post_function_exists', function_exists,
    'test_result', test_result,
    'schema_exists', (SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'net')),
    'extension_version', (SELECT extversion FROM pg_extension WHERE extname = 'pg_net')
  );
  
  RETURN result;
END;
$function$;

-- Update the handle_new_reply function to use proper error handling
-- and correct namespace for http_post
CREATE OR REPLACE FUNCTION public.handle_new_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  reply_author_role text;
  notification_recipient_type text;
  response_status integer;
  response_body text;
  headers jsonb;
  supabase_url text;
  auth_token text;
BEGIN
  -- Get the role of the user who created the reply
  SELECT role INTO reply_author_role 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Log key information for debugging
  RAISE LOG 'Notification trigger fired for reply: %, by user: % with role: %', NEW.id, NEW.user_id, reply_author_role;
  
  -- Determine notification recipient type based on the reply author's role
  IF reply_author_role = 'consultant' THEN
    notification_recipient_type := 'user';
  ELSE
    notification_recipient_type := 'consultant';
  END IF;

  -- Skip sending notification for internal replies to users
  IF NEW.is_internal = true AND notification_recipient_type = 'user' THEN
    RAISE LOG 'Skipping notification for internal reply % to user', NEW.id;
    RETURN NEW;
  END IF;

  -- Set up the headers and URL
  supabase_url := 'https://uaoeabhtbynyfzyfzogp.supabase.co';
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
  );

  -- Call the edge function to send notification with proper error handling
  BEGIN
    SELECT 
      status, content::text
    INTO 
      response_status, response_body
    FROM 
      net.http_post(
        url := supabase_url || '/functions/v1/send-case-notification',
        body := jsonb_build_object(
          'caseId', NEW.case_id,
          'replyId', NEW.id,
          'recipientType', notification_recipient_type
        )::text,
        headers := headers
      );
    
    IF response_status BETWEEN 200 AND 299 THEN
      RAISE LOG 'Notification edge function called successfully for reply: %, recipient type: %, response: %', 
                NEW.id, notification_recipient_type, response_body;
    ELSE
      RAISE LOG 'Notification edge function returned error status % for reply %: %', 
                response_status, NEW.id, response_body;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Exception calling notification edge function for reply %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Create a trigger on the replies table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'notify_on_new_reply'
  ) THEN
    CREATE TRIGGER notify_on_new_reply
      AFTER INSERT ON public.replies
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_reply();
    
    RAISE NOTICE 'Notification trigger created for replies table';
  ELSE
    RAISE NOTICE 'Notification trigger already exists for replies table';
  END IF;
END
$$;
