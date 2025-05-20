
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  caseId: string;
  replyId: string;
  recipientType: "user" | "consultant";
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Parse request data
  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  const { caseId, replyId, recipientType } = payload;

  try {
    // Create a Supabase client with the Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the case details
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*, profiles!cases_user_id_fkey(*), categories(*)")
      .eq("id", caseId)
      .single();

    if (caseError) {
      throw new Error(`Error fetching case: ${caseError.message}`);
    }

    // Get the reply details
    const { data: replyData, error: replyError } = await supabase
      .from("replies")
      .select("*, profiles(*)")
      .eq("id", replyId)
      .single();

    if (replyError) {
      throw new Error(`Error fetching reply: ${replyError.message}`);
    }

    // Get the notification template
    const { data: templates, error: templateError } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("type", recipientType === "user" ? "user_notification" : "consultant_notification")
      .single();

    if (templateError) {
      console.log("Template error:", templateError);
      // Fall back to default template if not found
    }

    const templateSubject = templates?.subject || 
      (recipientType === "user" 
        ? "Your case has been updated" 
        : "New case reply notification");

    const templateBody = templates?.body || 
      (recipientType === "user" 
        ? "Your case {case_title} has received a new reply." 
        : "Case {case_title} has received a new reply from {user_name}.");

    // Replace template variables
    const subject = templateSubject.replace("{case_title}", caseData.title);
    
    const body = templateBody
      .replace("{case_title}", caseData.title)
      .replace("{user_name}", replyData.profiles.name)
      .replace("{case_id}", caseId)
      .replace("{case_status}", caseData.status)
      .replace("{case_priority}", caseData.priority)
      .replace("{category}", caseData.categories?.name || "")
      .replace("{reply_content}", replyData.content);

    // Determine recipient email
    let recipientEmail;
    if (recipientType === "user") {
      recipientEmail = caseData.profiles.email; // The case owner's email
    } else {
      // For consultant notifications, use the configured services email
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("services_email")
        .single();
      
      recipientEmail = settings?.services_email || "services@techlinx.se";
    }

    // Send the email
    // In a production environment, you would integrate with an email service like SendGrid or AWS SES
    console.log(`Sending ${recipientType} notification email to: ${recipientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    
    // Since we're not actually sending emails in this demo, we'll just log the information
    // In a real scenario, you would add email sending logic here

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification for ${recipientType} would be sent to ${recipientEmail}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-case-notification function:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
