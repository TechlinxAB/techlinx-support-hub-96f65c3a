
/**
 * Helper functions for authentication and authorization with improved error handling
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the current user is a consultant by querying the profiles table
 * Used as a safety check beyond the UI restrictions
 */
export const isConsultant = async (): Promise<boolean> => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session check error in isConsultant:', sessionError);
      return false;
    }
    
    if (!session) {
      return false;
    }
    
    // Query the profiles table to check if the user has a consultant role
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking consultant role:', error);
      return false;
    }
    
    return data?.role === 'consultant';
  } catch (err) {
    console.error('Error in isConsultant check:', err);
    return false;
  }
};

/**
 * Checks if the current user has permission to access a company
 * Used as a safety check beyond the UI restrictions
 */
export const hasCompanyAccess = async (companyId: string): Promise<boolean> => {
  if (!companyId) {
    console.error("Invalid company ID provided to hasCompanyAccess");
    return false;
  }
  
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session check error in hasCompanyAccess:', sessionError);
      return false;
    }
    
    if (!session) {
      return false;
    }
    
    // First, check if the user is a consultant (consultants have access to all companies)
    const isUserConsultant = await isConsultant();
    if (isUserConsultant) {
      return true;
    }
    
    // If not a consultant, check if the user belongs to the company
    const { data, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking company access:', error);
      return false;
    }
    
    return data?.company_id === companyId;
  } catch (err) {
    console.error('Error in hasCompanyAccess check:', err);
    return false;
  }
};

/**
 * Safely gets the current user ID without throwing errors
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (err) {
    console.error('Error getting current user ID:', err);
    return null;
  }
};

/**
 * Validates token for improved error detection
 */
export const validateSession = async (): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> => {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { valid: false, error: error.message };
    }
    
    if (!session) {
      return { valid: false, error: 'No session found' };
    }
    
    // Check that token isn't expired
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt < now) {
      return { valid: false, error: 'Session expired', userId: session.user.id };
    }
    
    return { valid: true, userId: session.user.id };
  } catch (err) {
    console.error('Error validating session:', err);
    return { valid: false, error: 'Exception during validation' };
  }
};
