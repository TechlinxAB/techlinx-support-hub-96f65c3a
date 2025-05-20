
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { Resend } from "npm:resend@2.0.0";

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

    // Get the notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .single();

    if (settingsError) {
      throw new Error(`Error fetching notification settings: ${settingsError.message}`);
    }

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

    // Add signature if available
    const emailContent = settings.email_signature 
      ? `${body}\n\n${settings.email_signature}`
      : body;

    // Determine recipient email
    let recipientEmail;
    if (recipientType === "user") {
      recipientEmail = caseData.profiles.email; // The case owner's email
    } else {
      recipientEmail = settings.services_email || "services@techlinx.se";
    }

    // Check if an email provider is configured
    if (settings.email_provider === "resend" && settings.resend_api_key) {
      // Initialize Resend with the API key
      const resend = new Resend(settings.resend_api_key);
      
      // Format the HTML content
      const htmlContent = emailContent.replace(/\n/g, "<br>");
      
      // Send the email using Resend
      const emailResult = await resend.emails.send({
        from: `${settings.sender_name || "Techlinx Support"} <${settings.sender_email || "notifications@techlinx.se"}>`,
        to: [recipientEmail],
        subject: subject,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">${htmlContent}</div>`,
      });
      
      console.log("Email sent via Resend:", emailResult);
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: `Notification sent to ${recipientEmail} via Resend`,
          provider: "resend",
          id: emailResult.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      // Log the information since no email provider is configured
      console.log(`Would send ${recipientType} notification email to: ${recipientEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${emailContent}`);
      
      // Return success response (but no actual email was sent)
      return new Response(
        JSON.stringify({
          success: true,
          message: `Notification for ${recipientType} would be sent to ${recipientEmail} (email provider not configured)`,
          provider: "none"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in send-case-notification function:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
