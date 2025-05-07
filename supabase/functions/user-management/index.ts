
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Create a Supabase client with the Admin key
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'user' | 'consultant';
  preferredLanguage: 'en' | 'sv';
  companyId?: string;
}

interface UpdateUserPayload {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: 'user' | 'consultant';
  preferredLanguage?: 'en' | 'sv';
  companyId?: string | null;
  status?: 'active' | 'inactive';
}

interface ResetPasswordPayload {
  userId: string;
  password: string;
}

interface DeleteUserPayload {
  userId: string;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is authenticated and is a consultant
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData || profileData.role !== "consultant") {
      return new Response(
        JSON.stringify({ error: "Only consultants can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { action, data } = await req.json();

    // Handle different actions
    switch (action) {
      case "createUser": {
        const payload = data as CreateUserPayload;
        
        // Create the user
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
          user_metadata: {
            name: payload.name
          }
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!userData.user) {
          return new Response(
            JSON.stringify({ error: "Failed to create user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile with additional details
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            name: payload.name,
            phone: payload.phone || null,
            role: payload.role,
            preferred_language: payload.preferredLanguage,
            company_id: payload.companyId || null
          })
          .eq("id", userData.user.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, user: userData.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "updateUser": {
        const payload = data as UpdateUserPayload;
        
        // Update profile information
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            company_id: payload.companyId,
            role: payload.role,
            preferred_language: payload.preferredLanguage
          })
          .eq("id", payload.userId);
          
        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If status is included, update the user's ban status
        if (payload.status) {
          if (payload.status === 'inactive') {
            // Disable user account (ban for 10 years)
            const { error } = await supabaseAdmin.auth.admin.updateUserById(
              payload.userId,
              { ban_duration: '87600h' }
            );
            
            if (error) {
              return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else if (payload.status === 'active') {
            // Enable user account
            const { error } = await supabaseAdmin.auth.admin.updateUserById(
              payload.userId,
              { ban_duration: null }
            );
            
            if (error) {
              return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resetPassword": {
        const payload = data as ResetPasswordPayload;
        
        // Reset password
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          payload.userId,
          { password: payload.password }
        );
        
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "deleteUser": {
        const payload = data as DeleteUserPayload;
        
        // Delete user
        const { error } = await supabaseAdmin.auth.admin.deleteUser(
          payload.userId
        );
        
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
