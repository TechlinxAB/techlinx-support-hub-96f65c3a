
-- Function to check if pg_net extension exists and is properly installed
CREATE OR REPLACE FUNCTION public.check_pgnet_status()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_net'
  );
END;
$function$;
