
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import nodemailer from "npm:nodemailer@6.9.9";

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

    console.log("Notification settings retrieved:", {
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: false, // We'll use STARTTLS
      user: settings.smtp_user
      // Not logging password for security
    });

    // Check if we have valid SMTP settings
    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      return new Response(
        JSON.stringify({ 
          error: "SMTP configuration is incomplete. Please configure your SMTP settings properly." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Create the styled HTML email template with Techlinx branding
    const baseUrl = settings.base_url || "https://helpdesk.techlinx.se";
    const techlinxLogoUrl = `${baseUrl}/lovable-uploads/6ccedc19-181d-4786-9b9f-62fc5f4131e1.png`;
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Email from Support System</title>
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
        .email-logo {
          max-height: 60px;
          width: auto;
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
        .success-box {
          background-color: #f0f7f0;
          border-left: 4px solid #387A3D;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
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
          <img src="${techlinxLogoUrl}" alt="Techlinx" class="email-logo">
        </div>
        <div class="email-content">
          <h1>Email Configuration Test</h1>
          <p>This is a test email from your Techlinx Helpdesk support system.</p>
          
          <div class="success-box">
            <p style="font-weight: bold; color: #387A3D;">If you're seeing this, your email configuration is working correctly! ✓</p>
          </div>
          
          <p>Your support system is now properly configured to send email notifications.</p>
          
          <p>This message confirms that:</p>
          <ul>
            <li>Your SMTP server connection is working</li>
            <li>Authentication is successful</li>
            <li>Email delivery is properly configured</li>
          </ul>
          
          <p>You can now start using email notifications for case updates.</p>
        </div>
        <div class="email-footer">
          <p>&copy; ${new Date().getFullYear()} Techlinx. All rights reserved.</p>
          <p>This is an automated message from your support system.</p>
        </div>
      </div>
    </body>
    </html>
    `;
      
    try {
      console.log(`Starting SMTP test with Nodemailer to: ${recipientEmail}`);
      console.log(`Using SMTP server: ${settings.smtp_host}:${settings.smtp_port || 587}`);
      
      // Configure Nodemailer transporter
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
      
      console.log("Nodemailer transporter configured, verifying...");
      
      // Verify SMTP configuration
      await transporter.verify();
      
      console.log("SMTP configuration verified successfully, sending test email...");
      
      // Send a test email
      const info = await transporter.sendMail({
        from: settings.sender_email ? 
          `"${settings.sender_name || "Support"}" <${settings.sender_email}>` : 
          `"${settings.sender_name || "Support"}" <${settings.smtp_user}>`,
        to: recipientEmail,
        subject: "Test Email from Techlinx Helpdesk",
        text: "This is a test email from your Techlinx Helpdesk support system.\n\nIf you're seeing this, your email configuration is working correctly!",
        html: htmlContent,
      });
      
      console.log("Test email sent successfully", info.messageId);
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email sent to ${recipientEmail}`,
          provider: "smtp",
          messageId: info.messageId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (smtpError) {
      console.error("Detailed SMTP Error:", smtpError);
      
      // Provide more specific error message based on common SMTP issues
      let errorMessage = `SMTP Error: ${smtpError.message || "Failed to send email via SMTP"}`;
      let errorDetails = {};
      
      if (smtpError.message?.includes("authentication")) {
        errorMessage = "SMTP Authentication failed: Please check your username and password";
        errorDetails = { type: "auth_error", message: smtpError.message };
      } else if (smtpError.message?.includes("connection") || smtpError.code === 'ECONNECTION') {
        errorMessage = "SMTP Connection error: Unable to establish connection to the SMTP server";
        errorDetails = { type: "connection_error", message: smtpError.message, code: smtpError.code };
      } else if (smtpError.message?.includes("timeout") || smtpError.code === 'ETIMEDOUT') {
        errorMessage = "SMTP Timeout: The connection to the SMTP server timed out";
        errorDetails = { type: "timeout_error", message: smtpError.message, code: smtpError.code };
      } else if (smtpError.code === 'ESOCKET') {
        errorMessage = "SMTP Socket error: Problem with the connection";
        errorDetails = { type: "socket_error", message: smtpError.message, code: smtpError.code };
      }
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error in test-email function:", error.message, error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack, // Include stack trace for debugging
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
