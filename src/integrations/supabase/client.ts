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
export const CURRENT_AUTH_VERSION = '1.2.3';

// Important! Initialize these variables at the top level,
// before any function calls to prevent 'cannot access before initialization' errors
const inMemoryStorage = new Map<string, string>();
let storageInitialized = false;

// Create a custom storage object with debugging
const createStorage = () => {
  // Prevent multiple initializations
  if (storageInitialized) {
    return createLocalStorageWithFallback();
  }
  
  storageInitialized = true;
  
  return createLocalStorageWithFallback();
};

// Move storage logic into a separate function to improve initialization order
const createLocalStorageWithFallback = () => {
  try {
    // Test localStorage access
    localStorage.setItem('storage_test', 'test');
    localStorage.removeItem('storage_test');
    
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
    return {
      getItem: (key: string) => inMemoryStorage.get(key) || null,
      setItem: (key: string, value: string) => inMemoryStorage.set(key, value),
      removeItem: (key: string) => inMemoryStorage.delete(key),
      clear: () => inMemoryStorage.clear()
    };
  }
};

// Function to check if circuit breaker is active with details
export const isCircuitBreakerActive = (): { active: boolean, reason?: string, remainingSeconds?: number } => {
  try {
    // Check if we recently had a successful auth - if so, don't activate circuit breaker
    const lastSuccessfulAuth = parseInt(localStorage.getItem(SUCCESSFUL_AUTH_KEY) || '0', 10);
    const now = Date.now();
    
    // If we've had a successful auth in the last 60 seconds, bypass circuit breaker (increased from 30 seconds)
    if (lastSuccessfulAuth > 0 && (now - lastSuccessfulAuth < 60000)) {
      resetCircuitBreaker(); // Auto-reset circuit breaker on recent successful auth
      return { active: false };
    }
    
    const circuitBreakerData = localStorage.getItem(CIRCUIT_BREAKER_KEY);
    if (!circuitBreakerData) return { active: false };
    
    try {
      const { expiry, reason } = JSON.parse(circuitBreakerData);
      
      if (now < expiry) {
        const remainingSeconds = Math.round((expiry - now) / 1000);
        
        // If less than 10 seconds remaining in circuit breaker, auto-reset it 
        // to prevent getting stuck in short timeouts
        if (remainingSeconds < 10) {
          resetCircuitBreaker();
          return { active: false };
        }
        
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
      
      // If less than 10 seconds remaining in circuit breaker, auto-reset it
      if (Date.now() < expiryTime) {
        const secondsRemaining = Math.round((expiryTime - Date.now()) / 1000);
        
        if (secondsRemaining < 10) {
          resetCircuitBreaker();
          return { active: false };
        }
        
        return { 
          active: true,
          reason: "Legacy circuit breaker format",
          remainingSeconds: secondsRemaining
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

// Function to detect and reset authentication errors - MODIFIED to be less aggressive
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
      
      // We'll clear auth state but without trying to sign out from supabase yet
      // (since the client might not be initialized)
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_ERROR_KEY);
        localStorage.removeItem(CIRCUIT_BREAKER_KEY);
        localStorage.removeItem(SESSION_CHECK_TIMESTAMP);
        localStorage.removeItem(SUCCESSFUL_AUTH_KEY);
        
        console.log("🧹 Basic auth state cleared due to version mismatch");
      } catch (e) {
        console.error("Failed to clean up during version update", e);
      }
    }
  } catch (e) {
    console.error("Failed to initialize auth version", e);
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

// Advanced circuit breaker pattern with diagnostic info - MODIFIED to be less aggressive
export const activateCircuitBreaker = (timeoutMinutes = 1, reason = "Unknown"): void => {
  try {
    // Reduced default timeoutMinutes from 5 to 1
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

// First initialize auth version - it's important this happens before client creation
// to avoid the "Cannot access before initialization" error
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

// Enhanced function to clear auth state - moved AFTER client is initialized
export const clearAuthState = async () => {
  try {
    console.log("🧹 Clearing all auth state...");
    
    // Step 1: Try to sign out from Supabase first
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (signOutError) {
      console.error('Error during sign out:', signOutError);
      // Continue with cleanup even if sign out fails
    }
    
    // Step 2: Clean all auth-related localStorage items
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTH_ERROR_KEY);
    localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    localStorage.removeItem(AUTH_INIT_COUNT);
    localStorage.removeItem(AUTH_LAST_INIT);
    localStorage.removeItem(SESSION_CHECK_TIMESTAMP);
    localStorage.removeItem(SUCCESSFUL_AUTH_KEY);
    
    // We'll keep the version key to maintain our version tracking
    localStorage.setItem(VERSION_KEY, CURRENT_AUTH_VERSION);
    
    // Step 3: Clear any session cookies
    try {
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    } catch (e) {
      console.error('Error clearing cookies:', e);
    }
    
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
