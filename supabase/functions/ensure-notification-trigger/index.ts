
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔧 ensure-notification-trigger function called");
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Create a Supabase client with the Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("🔧 Missing required environment variables for Supabase connection");
      throw new Error("Server configuration error: Missing Supabase credentials");
    }
    
    console.log(`🔧 Connecting to Supabase at ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the SQL to install or update the trigger
    const { data, error } = await supabase.rpc('install_notification_trigger');

    if (error) {
      console.error("🔧 Error installing notification trigger:", error);
      throw new Error(`Failed to install notification trigger: ${error.message}`);
    }

    console.log("🔧 Notification trigger installation response:", data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification trigger installed/updated successfully",
        data
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error("🔧 Error in ensure-notification-trigger function:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
