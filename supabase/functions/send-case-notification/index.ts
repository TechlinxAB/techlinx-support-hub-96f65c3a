
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
  console.log("🔔 send-case-notification function called");
  console.log(`🔔 Request method: ${req.method}`);
  console.log(`🔔 Request URL: ${req.url}`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("🔔 Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Parse request data
  let payload: NotificationPayload;
  try {
    const text = await req.text();
    console.log(`🔔 Raw request body: ${text}`);
    payload = JSON.parse(text);
    console.log(`🔔 Parsed payload:`, payload);
  } catch (error) {
    console.error(`🔔 Failed to parse request payload:`, error);
    return new Response(
      JSON.stringify({ error: "Invalid request payload", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  const { caseId, replyId, recipientType } = payload;
  
  console.log(`🔔 Processing notification - Case: ${caseId}, Reply: ${replyId}, Recipient: ${recipientType}`);
  
  try {
    // Create a Supabase client with the Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("🔔 Missing required environment variables for Supabase connection");
      throw new Error("Server configuration error: Missing Supabase credentials");
    }
    
    console.log(`🔔 Connecting to Supabase at ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the notification settings
    console.log(`🔔 Fetching notification settings`);
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .single();

    if (settingsError) {
      console.error(`🔔 Error fetching notification settings:`, settingsError);
      throw new Error(`Error fetching notification settings: ${settingsError.message}`);
    }
    
    console.log("🔔 Notification settings retrieved:", {
      smtpConfigured: !!settings.smtp_host,
      smtpHost: settings.smtp_host,
      smtpPort: settings.smtp_port || 587,
      servicesEmail: settings.services_email,
      hasSmtpUser: !!settings.smtp_user,
      hasSmtpPassword: !!settings.smtp_password,
      senderName: settings.sender_name,
      senderEmail: settings.sender_email,
      emailProvider: settings.email_provider
    });

    // Handle special case for test notifications
    if (replyId === 'test-reply-id') {
      console.log('🔔 Processing test notification - using mock reply data');
      
      // Return success response for test notification
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test notification would be sent to ${recipientType} (if email provider is configured)`,
          provider: "test",
          caseId: caseId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get the case details
    console.log(`🔔 Fetching case details for case ID: ${caseId}`);
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*, profiles!cases_user_id_fkey(*), categories(*)")
      .eq("id", caseId)
      .single();

    if (caseError) {
      console.error(`🔔 Error fetching case:`, caseError);
      throw new Error(`Error fetching case: ${caseError.message}`);
    }
    
    console.log("🔔 Case data retrieved:", {
      caseId: caseData.id,
      caseTitle: caseData.title,
      userId: caseData.user_id,
      userEmail: caseData.profiles?.email,
      userName: caseData.profiles?.name
    });

    // Get the reply details
    console.log(`🔔 Fetching reply details for reply ID: ${replyId}`);
    
    const { data: replyData, error: replyError } = await supabase
      .from("replies")
      .select("*, profiles(*)")
      .eq("id", replyId)
      .single();

    if (replyError) {
      console.error(`🔔 Error fetching reply:`, replyError);
      throw new Error(`Error fetching reply: ${replyError.message}`);
    }
    
    console.log("🔔 Reply data retrieved:", {
      replyId: replyData.id,
      replyAuthor: replyData.profiles?.name,
      isInternal: replyData.is_internal,
      contentPreview: replyData.content.substring(0, 50) + (replyData.content.length > 50 ? '...' : '')
    });
    
    // Skip sending if the reply is marked as internal and we're notifying a user
    if (replyData.is_internal && recipientType === "user") {
      console.log("🔔 Skipping notification for internal reply to user");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Notification skipped - internal reply" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get the notification template
    const { data: templates, error: templateError } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("type", recipientType === "user" ? "user_notification" : "consultant_notification")
      .single();

    if (templateError) {
      console.log("🔔 Template error:", templateError);
      // Fall back to default template if not found
      console.log("🔔 Using fallback template");
    }

    console.log("🔔 Template data:", templates || "Using fallback template");

    // Create case link based on current environment
    const baseUrl = "https://support.example.com";
    const caseLink = `${baseUrl}/cases/${caseId}`;

    const templateSubject = templates?.subject || 
      (recipientType === "user" 
        ? "Your case has been updated" 
        : "New case reply notification");

    const templateBody = templates?.body || 
      (recipientType === "user" 
        ? "Your case {case_title} has received a new reply. You can view and respond to this case by following this link: {case_link}" 
        : "Case {case_title} has received a new reply from {user_name}. You can view and respond to this case by following this link: {case_link}");

    // Replace template variables
    const subject = templateSubject.replace("{case_title}", caseData.title);
    
    const body = templateBody
      .replace("{case_title}", caseData.title)
      .replace("{user_name}", replyData.profiles?.name || "a user")
      .replace("{case_id}", caseId)
      .replace("{case_status}", caseData.status)
      .replace("{case_priority}", caseData.priority)
      .replace("{category}", caseData.categories?.name || "")
      .replace("{reply_content}", replyData.content)
      .replace("{case_link}", caseLink);

    console.log("🔔 Notification content prepared:", { 
      subject,
      bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '') 
    });

    // Add signature if available
    const emailContent = settings.email_signature 
      ? `${body}\n\n${settings.email_signature}`
      : body;

    // Determine recipient email
    let recipientEmail;
    if (recipientType === "user") {
      recipientEmail = caseData.profiles?.email; // The case owner's email
    } else {
      recipientEmail = settings.services_email || "services@techlinx.se";
    }
    
    console.log(`🔔 Sending notification to ${recipientEmail} (${recipientType})`);

    // Format the HTML content
    const htmlContent = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      ${emailContent.replace(/\n/g, "<br>")}
    </div>`;

    // Check if we have valid SMTP settings
    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      console.log(`🔔 Would send ${recipientType} notification email to: ${recipientEmail}`);
      console.log(`🔔 Subject: ${subject}`);
      console.log(`🔔 Body: ${emailContent}`);
      
      // Return log-only response when SMTP is not configured
      return new Response(
        JSON.stringify({
          success: true,
          message: `Notification for ${recipientType} would be sent to ${recipientEmail} (email provider not configured)`,
          provider: "none",
          recipient: recipientEmail,
          subject: subject
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      try {
        console.log(`🔔 Starting SMTP test with Nodemailer to: ${recipientEmail}`);
        console.log(`🔔 Using SMTP server: ${settings.smtp_host}:${settings.smtp_port || 587}`);
        
        // Configure Nodemailer transporter - Use same configuration as test-email
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          secure: false, // We'll use STARTTLS instead
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password,
          },
          requireTLS: true, // Force using TLS
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          },
          debug: true, // Enable debug output
        });
        
        console.log("🔔 Nodemailer transporter configured, verifying...");
        
        // Verify SMTP configuration
        await transporter.verify();
        
        console.log("🔔 SMTP configuration verified successfully, sending notification email...");
        
        // Send the email
        const info = await transporter.sendMail({
          from: settings.sender_email ? 
            `"${settings.sender_name || "Support"}" <${settings.sender_email}>` : 
            `"${settings.sender_name || "Support"}" <${settings.smtp_user}>`,
          to: recipientEmail,
          subject: subject,
          text: emailContent,
          html: htmlContent
        });
        
        console.log("🔔 Email sent via SMTP to", recipientEmail, "Message ID:", info.messageId);
        
        // Return success response
        return new Response(
          JSON.stringify({
            success: true,
            message: `Notification sent to ${recipientEmail} via SMTP`,
            provider: "smtp",
            messageId: info.messageId,
            recipient: recipientEmail
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (smtpError) {
        console.error("🔔 SMTP Error Details:", smtpError);
        
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
    console.error("🔔 Error in send-case-notification function:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack, // Include stack trace for debugging
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
