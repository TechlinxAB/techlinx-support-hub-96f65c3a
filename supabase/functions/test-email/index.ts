
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
        subject: "Test Email from Support System",
        text: "This is a test email from your support system.\n\nIf you're seeing this, your email configuration is working correctly!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #333;">Email Configuration Test</h2>
            <p>This is a test email from your support system.</p>
            <p style="font-weight: bold; color: #22c55e;">If you're seeing this, your email configuration is working correctly! ✓</p>
            <p style="color: #666; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.9em;">
              Sent from your support system using SMTP.
            </p>
          </div>
        `,
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
