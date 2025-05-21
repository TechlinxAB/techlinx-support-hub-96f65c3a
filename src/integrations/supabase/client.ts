
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
    console.log('Starting clearAuthState process');
    
    // IMPORTANT: First clear local storage to ensure client state is always cleaned
    // This is the most critical part - clearing local state regardless of server response
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear any other related Supabase auth items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    
    console.log(`Found ${authKeys.length} auth-related localStorage keys to remove`);
    
    for (const key of authKeys) {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    }
    
    // Only after client cleanup, try to sign out with Supabase
    // But treat this as optional - the local cleanup above is what really matters
    try {
      console.log('Attempting server-side signOut');
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Server-side signOut completed successfully');
    } catch (signOutError) {
      // This is expected in some cases (e.g., session already invalid)
      // We just log it but continue - the important part is the local cleanup
      console.log('Server-side signOut returned error (expected in some cases):', signOutError);
    }
    
    console.log('Auth state cleared successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error in clearAuthState:', error);
    // Even if something unexpected happens, we still want to ensure localStorage is cleared
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed final attempt to clear storage:', e);
    }
    return false;
  }
};
