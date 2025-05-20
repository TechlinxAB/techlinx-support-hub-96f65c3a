
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Parse request data
  let payload: { recipientEmail: string };
  try {
    payload = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  const { recipientEmail } = payload;

  if (!recipientEmail) {
    return new Response(
      JSON.stringify({ error: "Recipient email is required" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  try {
    // Create a Supabase client with the Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .single();

    if (settingsError) {
      throw new Error(`Error fetching notification settings: ${settingsError.message}`);
    }

    // Check if Resend is configured
    if (settings.email_provider !== "resend" || !settings.resend_api_key) {
      return new Response(
        JSON.stringify({ 
          error: "Resend is not configured. Please configure Resend in the notification settings." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Resend with the API key
    const resend = new Resend(settings.resend_api_key);
    
    // Send a test email
    const emailResult = await resend.emails.send({
      from: `${settings.sender_name || "Techlinx Support"} <${settings.sender_email || "notifications@techlinx.se"}>`,
      to: [recipientEmail],
      subject: "Test Email from Techlinx Support",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Configuration Test</h2>
          <p>This is a test email from your Techlinx Support system.</p>
          <p>Your email notification system is working correctly!</p>
          <p style="color: #666; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em;">
            Sent from your Techlinx Support system using Resend.
          </p>
        </div>
      `,
    });
    
    console.log("Test email sent via Resend:", emailResult);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email sent to ${recipientEmail}`,
        id: emailResult.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in test-email function:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
