
/**
 * Helper functions for authentication and authorization
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the current user is a consultant by querying the profiles table
 * Used as a safety check beyond the UI restrictions
 */
export const isConsultant = async (): Promise<boolean> => {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return false;
    
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
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return false;
    
    // First, check if the user is a consultant (consultants have access to all companies)
    const isUserConsultant = await isConsultant();
    if (isUserConsultant) return true;
    
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
