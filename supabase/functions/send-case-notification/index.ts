
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import nodemailer from "npm:nodemailer@6.9.9";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaseNotificationRequest {
  caseId: string;
  replyId: string;
  recipientType: "user" | "consultant";
  skipEmail?: boolean; // Optional flag to skip actual email sending
  isHighPriority?: boolean; // Optional flag to explicitly mark high priority
  isNewCase?: boolean; // Optional flag to mark as new case notification
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse the request body with better error handling
    let parsedBody: CaseNotificationRequest;
    try {
      parsedBody = await req.json() as CaseNotificationRequest;
    } catch (parseError) {
      console.error("[HIGH PRIORITY DEBUG] Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", warning: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const { caseId, replyId, recipientType, skipEmail = false, isHighPriority = false, isNewCase = false } = parsedBody;
    
    if (!caseId) {
      return new Response(
        JSON.stringify({ error: "Case ID is required", warning: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!recipientType) {
      return new Response(
        JSON.stringify({ error: "Recipient type is required", warning: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`[HIGH PRIORITY DEBUG] Starting notification process for case ${caseId}, reply ${replyId}, to ${recipientType}`);
    console.log(`[HIGH PRIORITY DEBUG] Explicitly marked as high priority: ${isHighPriority}`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select(`
        id, 
        title,
        description,
        priority,
        status,
        category:categories(name),
        user:profiles!cases_user_id_fkey(id, name, email),
        company:companies!cases_company_id_fkey(id, name)
      `)
      .eq("id", caseId)
      .single();
      
    if (caseError) {
      console.error("[HIGH PRIORITY DEBUG] Error fetching case:", caseError);
      throw new Error(`Failed to fetch case: ${caseError.message}`);
    }
    
    if (!caseData) {
      throw new Error(`[HIGH PRIORITY DEBUG] Case not found with id: ${caseId}`);
    }

    // Check if this is a high priority case and log it clearly
    const caseIsHighPriority = caseData.priority === "high";
    console.log(`[HIGH PRIORITY DEBUG] Case priority: ${caseData.priority}, High priority case: ${caseIsHighPriority}`);

    // Get settings from the database (we still need SMTP settings and other configuration)
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .single();
      
    if (settingsError) {
      console.error("[HIGH PRIORITY DEBUG] Error fetching settings:", settingsError);
      throw new Error(`Failed to fetch notification settings: ${settingsError.message}`);
    }
    
    // Log settings to check if high priority notifications are enabled
    console.log(`[HIGH PRIORITY DEBUG] Settings: enable_priority_notifications = ${settings.enable_priority_notifications}`);
    
    // Determine who to send the notification to
    let recipientEmail: string;
    
    if (recipientType === "user") {
      // Send to the user who owns the case
      recipientEmail = caseData.user?.email;
    } else if (recipientType === "consultant") {
      // Send to consultants (service email)
      recipientEmail = settings.services_email;
    } else {
      throw new Error(`[HIGH PRIORITY DEBUG] Invalid recipient type: ${recipientType}`);
    }
    
    if (!recipientEmail) {
      throw new Error(`[HIGH PRIORITY DEBUG] No recipient email found for recipient type: ${recipientType}`);
    }

    console.log(`[HIGH PRIORITY DEBUG] Selected recipient email: ${recipientEmail}`);
    
    // Check if email provider is configured
    if (settings.email_provider === "none") {
      console.log(`[HIGH PRIORITY DEBUG] Email provider is set to 'none'. Skipping email sending to ${recipientEmail}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email provider is set to 'none'. Email would have been sent to: " + recipientEmail,
          debug: true,
          isHighPriority: isHighPriority
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // If skipEmail flag is set, don't actually send the email but log it
    if (skipEmail) {
      console.log(`[HIGH PRIORITY DEBUG] skipEmail flag set. Not sending actual email to ${recipientEmail}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sending skipped as requested. Would have sent to: " + recipientEmail,
          debug: true,
          isHighPriority: isHighPriority
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if SMTP settings are valid when using SMTP
    if (settings.email_provider === "smtp" && (!settings.smtp_host || !settings.smtp_user)) {
      console.error("[HIGH PRIORITY DEBUG] Invalid SMTP settings");
      return new Response(
        JSON.stringify({ 
          success: false,
          warning: true,
          message: "SMTP settings are not properly configured. Please check your email settings.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[HIGH PRIORITY DEBUG] Email provider: ${settings.email_provider}, SMTP host: ${settings.smtp_host}, SMTP user: ${settings.smtp_user}`);
    
    // Prepare the base URL for links
    const baseUrl = settings.base_url || "https://helpdesk.techlinx.se";
    const caseLink = `${baseUrl}/cases/${caseId}`;
    
    // Get reply content if a reply ID is provided
    let replyContent = "";
    let replyUser = null;
    if (replyId) {
      const { data: replyData, error: replyError } = await supabase
        .from("replies")
        .select("content, user:profiles!replies_user_id_fkey(name, id, role)")
        .eq("id", replyId)
        .single();
        
      if (replyError) {
        console.error("[HIGH PRIORITY DEBUG] Error fetching reply:", replyError);
        throw new Error(`Failed to fetch reply: ${replyError.message}`);
      }
      
      if (replyData) {
        replyContent = replyData.content;
        replyUser = replyData.user;
      }
    }

    // Prepare variables for email
    const caseTitle = caseData.title;
    const caseStatus = caseData.status;
    const casePriority = caseData.priority;
    const categoryName = caseData.category?.name || "";
    const userName = replyUser ? `${replyUser.name || "Unknown"}` : "System";
    
    // Set email subject based on case priority and recipient
    let subject: string;
    
    // Check if this is a high priority case (either explicitly marked or case priority is high)
    const shouldShowHighPriority = (isHighPriority || caseIsHighPriority) && settings.enable_priority_notifications;
    
    if (isNewCase) {
      if (shouldShowHighPriority) {
        subject = `🚨 URGENT: High Priority Case Submitted - ${caseTitle}`;
      } else {
        subject = `New Case Submitted - ${caseTitle}`;
      }
    } else if (recipientType === "user") {
      // Users never see priority level in subject - treat all cases the same
      subject = `Your case has been updated - ${caseTitle}`;
    } else {
      // For consultants (services@techlinx.se), show priority if it's high priority
      if (shouldShowHighPriority) {
        subject = `🚨 URGENT: High Priority Case Update - ${caseTitle}`;
      } else {
        subject = `Case Update - ${caseTitle}`;
      }
    }
    
    // Set notification type label for logs and email styling
    // Only show high priority in email styling for explicitly requested high priority notifications
    const isHighPriorityNotification = isHighPriority && settings.enable_priority_notifications;
    console.log(`[HIGH PRIORITY DEBUG] 🔔 Sending ${isHighPriorityNotification ? 'high priority' : 'normal'} notification to ${recipientEmail} (${recipientType})`);

    // Create the styled HTML email template with Techlinx branding
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        .email-header {
          background-color: #387A3D;
          padding: 20px;
          text-align: left;
        }
        .email-content {
          padding: 30px;
          line-height: 1.6;
        }
        .email-content h1 {
          color: #387A3D;
          margin-top: 0;
        }
        .email-content p {
          margin: 0 0 16px;
        }
        .case-info {
          background-color: ${isHighPriorityNotification ? settings.high_priority_color || '#ffebeb' : '#f0f7f0'};
          border-left: 4px solid ${isHighPriorityNotification ? '#e53e3e' : '#387A3D'};
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .case-info h2 {
          margin-top: 0;
          color: ${isHighPriorityNotification ? '#e53e3e' : '#387A3D'};
        }
        .case-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .case-info table td {
          padding: 5px 0;
        }
        .case-info table td:first-child {
          font-weight: bold;
          width: 30%;
        }
        .reply-content {
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .action-button {
          display: inline-block;
          background-color: #387A3D;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 20px;
        }
        .email-footer {
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #777777;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-header">
          <h2 style="color: white; margin: 0;">Techlinx Helpdesk</h2>
        </div>
        <div class="email-content">
          <div class="case-info">
            <h2>${isHighPriorityNotification ? 'URGENT: High Priority Case' : 'Case Update'}</h2>
            <table>
              <tr>
                <td>Title:</td>
                <td>${caseTitle}</td>
              </tr>
              <tr>
                <td>Status:</td>
                <td>${caseStatus}</td>
              </tr>
              <tr>
                <td>Priority:</td>
                <td>${casePriority}</td>
              </tr>
              <tr>
                <td>Category:</td>
                <td>${categoryName}</td>
              </tr>
            </table>
          </div>
          
          ${replyContent ? `
          <div class="reply-content">
            <p><strong>${userName} wrote:</strong></p>
            <p>${replyContent}</p>
          </div>
          ` : ''}
          
          <a href="${caseLink}" class="action-button">View Case</a>
        </div>
        <div class="email-footer">
          <p>${settings.email_signature || `&copy; ${new Date().getFullYear()} Techlinx. All rights reserved.`}</p>
          <p>This is an automated message from your support system.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Create transporter using settings from the database with enhanced error handling
    try {
      // Handle email sending based on provider
      if (settings.email_provider === "smtp") {
        console.log(`[HIGH PRIORITY DEBUG] Attempting to send ${isHighPriorityNotification ? 'high priority' : 'normal'} email via SMTP...`);
        
        // --- KEY CHANGE: Align with successful test-email configuration ---
        // Modified SMTP configuration to match working test-email function
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          secure: false, // Use STARTTLS instead (important change!)
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password,
          },
          requireTLS: true, // Force using TLS (important change!)
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          },
          debug: true, // Enable debug output
        });
        
        console.log("[HIGH PRIORITY DEBUG] SMTP transporter configured, sending email directly without verify...");
        
        // Try sending the email with retry logic
        let attempt = 0;
        const maxAttempts = 2;
        let lastError = null;
        
        while (attempt < maxAttempts) {
          try {
            // --- KEY CHANGE: Skip verify and send directly ---
            // Send email directly without verify step that fails
            const info = await transporter.sendMail({
              from: settings.sender_email ? 
                `"${settings.sender_name || "Support"}" <${settings.sender_email}>` : 
                `"${settings.sender_name || "Support"}" <${settings.smtp_user}>`,
              to: recipientEmail,
              subject: subject,
              html: htmlContent,
            });
            
            console.log(`[HIGH PRIORITY DEBUG] Email sent successfully via SMTP: ${info.messageId}`);
            
            return new Response(
              JSON.stringify({
                success: true,
                message: `Notification sent to ${recipientEmail}`,
                provider: "smtp",
                messageId: info.messageId,
                isHighPriority: isHighPriorityNotification
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          } catch (sendError: any) {
            attempt++;
            lastError = sendError;
            console.error(`[HIGH PRIORITY DEBUG] Error sending email (attempt ${attempt}/${maxAttempts}):`, sendError);
            
            // Wait a bit before retrying
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // If we reach here, all attempts failed
        console.error(`[HIGH PRIORITY DEBUG] All ${maxAttempts} attempts to send email failed. Last error:`, lastError);
        
        // Return a "success" response with warning flag so frontend doesn't block the user
        return new Response(
          JSON.stringify({
            success: false,
            warning: true, 
            message: `The case/reply was saved, but the notification email could not be sent after ${maxAttempts} attempts.`,
            error: lastError?.message,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        // Fallback to just logging for debug
        console.log(`[HIGH PRIORITY DEBUG] No valid email provider configured, would have sent:`, {
          to: recipientEmail,
          subject: subject,
          text: `Case update for ${caseTitle}. View at ${caseLink}`,
          isHighPriority: isHighPriorityNotification
        });
        
        // Return success for debug mode
        return new Response(
          JSON.stringify({
            success: true,
            message: `Debug mode: Notification would have been sent to ${recipientEmail}`,
            debug: true,
            isHighPriority: isHighPriorityNotification
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    } catch (sendError) {
      console.error(`[HIGH PRIORITY DEBUG] Error in email sending process:`, sendError);
      
      // Return a non-error response even though there was an error
      // This prevents the frontend from showing an error and allows the user to continue
      return new Response(
        JSON.stringify({ 
          success: false,
          warning: true,
          message: "The case/reply was saved, but there was an issue with the notification system.",
          error: `Email notification error: ${sendError.message}`,
          details: sendError 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error: any) {
    console.error("[HIGH PRIORITY DEBUG] Error processing notification request:", error);
    
    // Return a non-error response with warning to prevent frontend from showing an error
    return new Response(
      JSON.stringify({ 
        success: false,
        warning: true,
        message: "Your case/reply was saved, but there was an issue with the notification system.",
        error: `Notification system error: ${error.message}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
