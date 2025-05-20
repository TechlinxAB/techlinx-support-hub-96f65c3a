
-- First drop the existing trigger if it exists
DROP TRIGGER IF EXISTS notify_on_new_reply ON public.replies;

-- Recreate the trigger with the updated function
CREATE TRIGGER notify_on_new_reply
AFTER INSERT ON public.replies
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_reply();
