
import { supabase } from "@/integrations/supabase/client";
import { UserRole, Language } from "@/context/AppContext";

// Define the Supabase URL constant using the value from the client file
const SUPABASE_URL = "https://uaoeabhtbynyfzyfzogp.supabase.co";

// Service for user management operations
export const userManagementService = {
  // Create a new user
  async createUser({
    email,
    password,
    name,
    phone,
    role,
    preferredLanguage,
    companyId,
  }: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
    preferredLanguage: Language;
    companyId?: string;
  }) {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/user-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: "createUser",
          data: {
            email,
            password,
            name,
            phone,
            role,
            preferredLanguage,
            companyId,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create user");
    }

    return response.json();
  },

  // Update an existing user
  async updateUser({
    userId,
    name,
    email,
    phone,
    companyId,
    role,
    preferredLanguage,
    status,
  }: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    companyId?: string | null;
    role?: UserRole;
    preferredLanguage?: Language;
    status?: 'active' | 'inactive';
  }) {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/user-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: "updateUser",
          data: {
            userId,
            name,
            email,
            phone,
            companyId,
            role,
            preferredLanguage,
            status,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update user");
    }

    return response.json();
  },

  // Reset a user's password
  async resetPassword({ userId, password }: { userId: string; password: string }) {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/user-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: "resetPassword",
          data: {
            userId,
            password,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to reset password");
    }

    return response.json();
  },

  // Delete a user
  async deleteUser(userId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/user-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: "deleteUser",
          data: {
            userId,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete user");
    }

    return response.json();
  },
};
