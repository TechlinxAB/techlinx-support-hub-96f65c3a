
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://uaoeabhtbynyfzyfzogp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb2VhYmh0YnlueWZ6eWZ6b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjQzNzksImV4cCI6MjA2MjEwMDM3OX0.hqJiwG2IQindO2LVBg4Rhn42FvcuZGAAzr8qDMhFBTQ";

// Storage key used by Supabase SDK
export const STORAGE_KEY = 'sb-uaoeabhtbynyfzyfzogp-auth-token';
export const VERSION_KEY = 'auth-token-version';
export const AUTH_ERROR_KEY = 'auth-error-count';
export const CIRCUIT_BREAKER_KEY = 'auth-circuit-breaker';

// Set a version for the current auth implementation
// Increment this when making changes to auth logic
export const CURRENT_AUTH_VERSION = '1.0.0';

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

// Initialize the version in storage if it doesn't exist
const initAuthVersion = () => {
  try {
    if (!localStorage.getItem(VERSION_KEY)) {
      localStorage.setItem(VERSION_KEY, CURRENT_AUTH_VERSION);
    }
  } catch (e) {
    // Silent fail for environments without localStorage
  }
};

// Call this on application start
initAuthVersion();

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

// Enhanced function to clear auth state
export const clearAuthState = async () => {
  try {
    console.log("🧹 Clearing all auth state...");
    
    // Step 1: Clean all auth-related localStorage items
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(AUTH_ERROR_KEY);
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    
    // Step 2: Clear any session cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    
    // Step 3: Try to sign out from Supabase
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (signOutError) {
      console.error('Error during sign out:', signOutError);
      // Continue with cleanup even if sign out fails
    }
    
    // Step 4: Reset auth version to current
    localStorage.setItem(VERSION_KEY, CURRENT_AUTH_VERSION);
    
    console.log("✅ Auth state cleared successfully");
    return true;
  } catch (error) {
    console.error('Error clearing auth state:', error);
    
    // Step 5: Last resort - try to remove the token directly
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Silent fail
    }
    
    return false;
  }
};

// Function to check if the auth version matches the current version
export const isAuthVersionCurrent = (): boolean => {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    return storedVersion === CURRENT_AUTH_VERSION;
  } catch (e) {
    // If we can't check the version, assume it's not current
    return false;
  }
};

// Function to detect and reset authentication errors
export const trackAuthError = (): number => {
  try {
    const currentCount = parseInt(localStorage.getItem(AUTH_ERROR_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(AUTH_ERROR_KEY, newCount.toString());
    return newCount;
  } catch (e) {
    return 1; // Default to 1 if we can't access localStorage
  }
};

// Reset the error counter
export const resetAuthErrorCount = (): void => {
  try {
    localStorage.removeItem(AUTH_ERROR_KEY);
  } catch (e) {
    // Silent fail
  }
};

// Circuit breaker pattern to prevent auth loops
export const activateCircuitBreaker = (timeoutMinutes = 5): void => {
  try {
    const expiryTime = Date.now() + (timeoutMinutes * 60 * 1000);
    localStorage.setItem(CIRCUIT_BREAKER_KEY, expiryTime.toString());
  } catch (e) {
    // Silent fail
  }
};

// Check if circuit breaker is active
export const isCircuitBreakerActive = (): boolean => {
  try {
    const expiryTimeStr = localStorage.getItem(CIRCUIT_BREAKER_KEY);
    if (!expiryTimeStr) return false;
    
    const expiryTime = parseInt(expiryTimeStr, 10);
    return Date.now() < expiryTime;
  } catch (e) {
    return false; // Default to inactive if we can't check
  }
};

// Reset the circuit breaker
export const resetCircuitBreaker = (): void => {
  try {
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
  } catch (e) {
    // Silent fail
  }
};
