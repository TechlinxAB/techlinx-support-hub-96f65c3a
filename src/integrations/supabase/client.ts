
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://uaoeabhtbynyfzyfzogp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb2VhYmh0YnlueWZ6eWZ6b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjQzNzksImV4cCI6MjA2MjEwMDM3OX0.hqJiwG2IQindO2LVBg4Rhn42FvcuZGAAzr8qDMhFBTQ";

// Storage key used by Supabase SDK
export const STORAGE_KEY = 'sb-uaoeabhtbynyfzyfzogp-auth-token';

// Create a simple storage object
const createStorage = () => {
  try {
    return {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
      clear: () => localStorage.clear()
    };
  } catch (error) {
    // Fallback for environments where localStorage isn't available
    const storage = new Map<string, string>();
    return {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    };
  }
};

// Create and export the Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: createStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

// Simple function to clear auth state
export const clearAuthState = async () => {
  try {
    // Clean local storage
    localStorage.removeItem(STORAGE_KEY);
    
    // Try to sign out
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    return false;
  }
};
