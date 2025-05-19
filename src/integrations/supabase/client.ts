
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://uaoeabhtbynyfzyfzogp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb2VhYmh0YnlueWZ6eWZ6b2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjQzNzksImV4cCI6MjA2MjEwMDM3OX0.hqJiwG2IQindO2LVBg4Rhn42FvcuZGAAzr8qDMhFBTQ";

// Storage keys used by Supabase SDK and our enhanced auth
export const STORAGE_KEY = 'sb-uaoeabhtbynyfzyfzogp-auth-token';
export const VERSION_KEY = 'auth-token-version';
export const AUTH_ERROR_KEY = 'auth-error-count';
export const CIRCUIT_BREAKER_KEY = 'auth-circuit-breaker';
export const AUTH_INIT_COUNT = 'auth-init-count';
export const AUTH_LAST_INIT = 'auth-last-init';
export const SESSION_CHECK_TIMESTAMP = 'last-session-check';
export const SUCCESSFUL_AUTH_KEY = 'last-successful-auth';

// Set a version for the current auth implementation
// Increment this when making changes to auth logic
export const CURRENT_AUTH_VERSION = '1.2.2';

// Function to check if circuit breaker is active with details
export const isCircuitBreakerActive = (): { active: boolean, reason?: string, remainingSeconds?: number } => {
  try {
    // Check if we recently had a successful auth - if so, don't activate circuit breaker
    const lastSuccessfulAuth = parseInt(localStorage.getItem(SUCCESSFUL_AUTH_KEY) || '0', 10);
    const now = Date.now();
    
    // If we've had a successful auth in the last 30 seconds, bypass circuit breaker
    if (lastSuccessfulAuth > 0 && (now - lastSuccessfulAuth < 30000)) {
      resetCircuitBreaker(); // Auto-reset circuit breaker on recent successful auth
      return { active: false };
    }
    
    const circuitBreakerData = localStorage.getItem(CIRCUIT_BREAKER_KEY);
    if (!circuitBreakerData) return { active: false };
    
    try {
      const { expiry, reason } = JSON.parse(circuitBreakerData);
      
      if (now < expiry) {
        const remainingSeconds = Math.round((expiry - now) / 1000);
        return { 
          active: true,
          reason,
          remainingSeconds
        };
      }
      
      // Auto-reset if expired
      resetCircuitBreaker();
      return { active: false };
    } catch (e) {
      // If JSON parse fails, assume it's the old format
      const expiryTime = parseInt(circuitBreakerData, 10);
      if (Date.now() < expiryTime) {
        return { 
          active: true,
          reason: "Legacy circuit breaker format",
          remainingSeconds: Math.round((expiryTime - Date.now()) / 1000)
        };
      }
      resetCircuitBreaker();
      return { active: false };
    }
  } catch (e) {
    console.error("Failed to check circuit breaker", e);
    return { active: false };
  }
};

// Reset the circuit breaker
export const resetCircuitBreaker = (): void => {
  try {
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    console.log("🔓 Circuit breaker reset");
  } catch (e) {
    console.error("Failed to reset circuit breaker", e);
  }
};

// Reset the error counter
export const resetAuthErrorCount = (): void => {
  try {
    localStorage.removeItem(AUTH_ERROR_KEY);
    console.log("✅ Auth error count reset");
  } catch (e) {
    // Silent fail
  }
};

// Function to detect and reset authentication errors
export const trackAuthError = (): number => {
  try {
    const currentCount = parseInt(localStorage.getItem(AUTH_ERROR_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(AUTH_ERROR_KEY, newCount.toString());
    console.log(`⚠️ Auth error count: ${newCount}`);
    return newCount;
  } catch (e) {
    return 1; // Default to 1 if we can't access localStorage
  }
};

// Create a custom storage object with debugging
const createStorage = () => {
  try {
    return {
      getItem: (key: string) => {
        const value = localStorage.getItem(key);
        if (key === STORAGE_KEY && !value) {
          console.log("⚠️ Auth token not found in storage");
        }
        return value;
      },
      setItem: (key: string, value: string) => {
        if (key === STORAGE_KEY) {
          console.log("✅ Setting auth token in storage");
          // When setting the auth token, also mark that we had a successful auth
          try {
            localStorage.setItem(SUCCESSFUL_AUTH_KEY, Date.now().toString());
            // Reset error count when token is set
            resetAuthErrorCount();
          } catch (e) {
            // Ignore errors
          }
        }
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (key === STORAGE_KEY) {
          console.log("🗑️ Removing auth token from storage");
        }
        localStorage.removeItem(key);
      },
      clear: () => {
        console.log("🧹 Clearing all storage");
        localStorage.clear();
      }
    };
  } catch (error) {
    // Fallback for environments where localStorage isn't available
    console.warn("Using in-memory storage fallback");
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
    // Record initialization timing to detect React strict mode multiple init
    const now = Date.now();
    const lastInit = parseInt(localStorage.getItem(AUTH_LAST_INIT) || '0', 10);
    const initCount = parseInt(localStorage.getItem(AUTH_INIT_COUNT) || '0', 10);
    
    // If we're initializing very rapidly, likely in React strict mode
    if (now - lastInit < 2000) {
      localStorage.setItem(AUTH_INIT_COUNT, (initCount + 1).toString());
      console.log(`🔄 Auth system initialized ${initCount + 1} times in quick succession`);
    } else {
      localStorage.setItem(AUTH_INIT_COUNT, '1');
    }
    
    localStorage.setItem(AUTH_LAST_INIT, now.toString());
    
    // Set auth version if not present
    if (!localStorage.getItem(VERSION_KEY)) {
      localStorage.setItem(VERSION_KEY, CURRENT_AUTH_VERSION);
      console.log(`📋 Setting initial auth version to ${CURRENT_AUTH_VERSION}`);
    } else if (localStorage.getItem(VERSION_KEY) !== CURRENT_AUTH_VERSION) {
      // Version mismatch - update and force cleanup
      const oldVersion = localStorage.getItem(VERSION_KEY);
      console.log(`🔄 Updating auth version from ${oldVersion} to ${CURRENT_AUTH_VERSION}`);
      localStorage.setItem(VERSION_KEY, CURRENT_AUTH_VERSION);
      clearAuthState();
    }
  } catch (e) {
    console.error("Failed to initialize auth version", e);
  }
};

// Enhanced function to clear auth state
export const clearAuthState = async () => {
  try {
    console.log("🧹 Clearing all auth state...");
    
    // Step 1: Clean all auth-related localStorage items
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(AUTH_ERROR_KEY);
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    localStorage.removeItem(AUTH_INIT_COUNT);
    localStorage.removeItem(AUTH_LAST_INIT);
    localStorage.removeItem(SESSION_CHECK_TIMESTAMP);
    localStorage.removeItem(SUCCESSFUL_AUTH_KEY);
    
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

// Detect authentication initialization loops
export const detectAuthLoops = (): boolean => {
  try {
    const now = Date.now();
    const lastInit = parseInt(localStorage.getItem(AUTH_LAST_INIT) || '0', 10);
    const initCount = parseInt(localStorage.getItem(AUTH_INIT_COUNT) || '0', 10);
    
    // If many initializations happen in a short time window
    if (now - lastInit < 5000 && initCount > 10) {
      console.error(`🚨 Detected auth initialization loop: ${initCount} inits in ${now - lastInit}ms`);
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
};

// Check if the token is potentially stale based on Supabase server activity
export const isTokenPotentiallyStale = (): boolean => {
  try {
    const lastCheck = parseInt(localStorage.getItem(SESSION_CHECK_TIMESTAMP) || '0', 10);
    const now = Date.now();
    
    // If last API interaction was more than 1 hour ago
    if (lastCheck > 0 && now - lastCheck > 60 * 60 * 1000) {
      console.log(`⚠️ Token potentially stale - last API call ${Math.round((now - lastCheck) / 60000)} minutes ago`);
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
};

// Record successful auth action to prevent unnecessary circuit breaking
export const recordSuccessfulAuth = (): void => {
  try {
    localStorage.setItem(SUCCESSFUL_AUTH_KEY, Date.now().toString());
    // Also reset error counter on successful auth
    resetAuthErrorCount();
  } catch (e) {
    // Silent fail
  }
};

// Advanced circuit breaker pattern with diagnostic info
export const activateCircuitBreaker = (timeoutMinutes = 5, reason = "Unknown"): void => {
  try {
    const expiryTime = Date.now() + (timeoutMinutes * 60 * 1000);
    localStorage.setItem(CIRCUIT_BREAKER_KEY, JSON.stringify({
      expiry: expiryTime,
      reason: reason,
      activated: Date.now()
    }));
    console.log(`🔒 Circuit breaker activated for ${timeoutMinutes} minutes. Reason: ${reason}`);
  } catch (e) {
    console.error("Failed to activate circuit breaker", e);
  }
};

// Call this on application start - AFTER all functions are defined
initAuthVersion();

// Create and export the Supabase client with enhanced options
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: createStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: {
      fetch: (...args: Parameters<typeof fetch>) => {
        // Mark the timestamp of the last API request
        try {
          localStorage.setItem(SESSION_CHECK_TIMESTAMP, Date.now().toString());
        } catch (e) {
          // Ignore errors
        }
        return fetch(...args);
      }
    }
  }
);
