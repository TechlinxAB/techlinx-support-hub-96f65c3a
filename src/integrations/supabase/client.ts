
import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  'https://uaoeabhtbynyfzyfzogp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb2VhYmh0YnlueWZ6eWZ6b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjQzNzksImV4cCI6MjA2MjEwMDM3OX0.hqJiwG2IQindO2LVBg4Rhn42FvcuZGAAzr8qDMhFBTQ',
  {
    auth: {
      persistSession: true,
      storageKey: 'sb-uaoeabhtbynyfzyfzogp-auth-token',
      autoRefreshToken: true,
    }
  }
);

export const STORAGE_KEY = 'sb-uaoeabhtbynyfzyfzogp-auth-token';

// Function to clear authentication state from storage
export const clearAuthState = async () => {
  try {
    // Sign out with Supabase
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear auth token from local storage
    localStorage.removeItem(STORAGE_KEY);
    console.log('Auth state cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    return false;
  }
};
