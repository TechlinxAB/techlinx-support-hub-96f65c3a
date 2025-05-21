
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

// Enhanced function to clear authentication state from storage
export const clearAuthState = async () => {
  try {
    // Try to sign out with Supabase global scope first
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (signOutError) {
      console.error('Error during Supabase signOut:', signOutError);
      // Continue to cleanup even if signOut fails
    }
    
    // Clear auth token from local storage
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear any other related items that might be causing issues
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    
    for (const key of authKeys) {
      localStorage.removeItem(key);
    }
    
    console.log('Auth state cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    return false;
  }
};
