
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import nodemailer from "npm:nodemailer@6.9.9";

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

    // Format the HTML content
    const htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailContent.replace(/\n/g, "<br>")}
    </div>`;
    const plainTextContent = emailContent;

    // Check if we have valid SMTP settings
    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      console.log(`Would send ${recipientType} notification email to: ${recipientEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${emailContent}`);
      
      // Return log-only response when SMTP is not configured
      return new Response(
        JSON.stringify({
          success: true,
          message: `Notification for ${recipientType} would be sent to ${recipientEmail} (email provider not configured)`,
          provider: "none"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      try {
        console.log(`Attempting to send notification via Nodemailer to: ${recipientEmail}`);
        console.log(`Using SMTP server: ${settings.smtp_host}:${settings.smtp_port || 587}`);
        
        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          secure: false, // We'll use STARTTLS
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password,
          },
          requireTLS: true,
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          }
        });
        
        // Verify connection configuration
        await transporter.verify();
        console.log("SMTP connection verified successfully");
        
        // Send the email
        const info = await transporter.sendMail({
          from: settings.sender_email ? 
            `"${settings.sender_name || "Support"}" <${settings.sender_email}>` : 
            `"${settings.sender_name || "Support"}" <${settings.smtp_user}>`,
          to: recipientEmail,
          subject: subject,
          text: plainTextContent,
          html: htmlContent
        });
        
        console.log("Email sent via SMTP to", recipientEmail, "Message ID:", info.messageId);
        
        // Return success response
        return new Response(
          JSON.stringify({
            success: true,
            message: `Notification sent to ${recipientEmail} via SMTP`,
            provider: "smtp",
            messageId: info.messageId
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (smtpError) {
        console.error("SMTP Error Details:", smtpError);
        
        // Provide more specific error message based on common SMTP issues
        let errorMessage = `SMTP Error: ${smtpError.message || "Failed to send email via SMTP"}`;
        
        if (smtpError.message?.includes("authentication")) {
          errorMessage = "SMTP Authentication failed: Please check your username and password";
        } else if (smtpError.message?.includes("connection") || smtpError.code === 'ECONNECTION') {
          errorMessage = "SMTP Connection error: Unable to establish connection to the SMTP server";
        } else if (smtpError.message?.includes("timeout") || smtpError.code === 'ETIMEDOUT') {
          errorMessage = "SMTP Timeout: The connection to the SMTP server timed out";
        } else if (smtpError.code === 'ESOCKET') {
          errorMessage = "SMTP Socket error: Problem with the connection";
        }
        
        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    console.error("Error in send-case-notification function:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack // Include stack trace for debugging
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
