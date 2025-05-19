
import { supabase, STORAGE_KEY, validateTokenIntegrity } from "@/integrations/supabase/client";

/**
 * Detects potential auth loops by tracking login attempts
 * @returns true if an auth loop is detected
 */
export const detectAuthLoops = (): boolean => {
  try {
    // Skip during pause recovery to avoid false positives
    if (isPauseRecoveryRequired()) return false;
    
    // Get current time
    const now = Date.now();
    
    // Get auth attempts from session storage
    const authAttempts = JSON.parse(sessionStorage.getItem('authAttempts') || '[]');
    
    // Add current attempt
    authAttempts.push(now);
    
    // Keep only attempts from the last 60 seconds (increased from original)
    const recentAttempts = authAttempts.filter((time: number) => now - time < 60000);
    
    // Store updated attempts
    sessionStorage.setItem('authAttempts', JSON.stringify(recentAttempts));
    
    // Modified: Increased threshold to 15 attempts (from 10)
    // This is more lenient to accommodate legitimate retries
    const isLoop = recentAttempts.length > 15;
    
    // If a loop is detected, log it for debugging
    if (isLoop) {
      console.warn(`Auth loop detected: ${recentAttempts.length} attempts in the last minute`);
    }
    
    return isLoop;
  } catch (error) {
    console.error('Error detecting auth loops:', error);
    // If we can't check for loops, default to false to prevent blocking users
    return false;
  }
};

/**
 * Probes the Supabase service to check if it's responsive
 * @returns true if Supabase is responding
 */
export const probeSupabaseService = async (): Promise<boolean> => {
  try {
    // Use a lightweight API call to test Supabase availability
    const startTime = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const endTime = Date.now();
    
    // If response time is very fast, service is likely active
    const responseTime = endTime - startTime;
    console.log(`Supabase probe response time: ${responseTime}ms`);
    
    // If response time is over 2 seconds, service might be waking up
    if (responseTime > 2000) {
      console.log('Supabase service seems to be waking up from pause');
      markPauseRecoveryRequired();
      return false;
    }
    
    // If we got here with no error, Supabase is available
    // Automatically clear the pause recovery flag
    if (!error) {
      console.log('Supabase probe successful - service is available. Clearing pause recovery flag.');
      clearPauseRecoveryRequired();
      clearPauseDetected();
      resetRecoveryAttempts();
      resetAuthLoopState();
      return true;
    }
    
    return !error;
  } catch (error) {
    console.error('Supabase service probe failed:', error);
    return false;
  }
};

/**
 * Reset auth loop state
 */
export const resetAuthLoopState = (): void => {
  try {
    sessionStorage.removeItem('authAttempts');
    console.log('Auth loop detection state has been reset');
  } catch (error) {
    console.error('Error resetting auth loop state:', error);
  }
};

// NEW: Check if the current auth token might be stale
export const isTokenPotentiallyStale = async (): Promise<boolean> => {
  try {
    // First, check for token integrity issues
    if (!validateTokenIntegrity()) {
      console.log('Token integrity check failed - token might be corrupted');
      return true;
    }
    
    const { data: sessionData, error } = await supabase.auth.getSession();
    
    // If we get an error or no session, token is stale
    if (error || !sessionData.session) {
      console.log('No valid session found or error fetching session');
      return true;
    }
    
    // If the token expires in less than 10 minutes, consider it stale
    const expiresAt = sessionData.session.expires_at;
    if (!expiresAt) return true;
    
    const expirationDate = new Date(expiresAt * 1000);
    const now = new Date();
    
    // If token expires in less than 10 minutes, it's considered stale
    const isStale = (expirationDate.getTime() - now.getTime()) < 600000;
    
    if (isStale) {
      console.log('Token is stale - expires soon or has expired');
    }
    
    return isStale;
  } catch (error) {
    console.error('Error checking token staleness:', error);
    // If we get an error checking staleness, assume token is stale as a precaution
    return true;
  }
};

// NEW: Function to reset auth data with proper cleanup
export const cleanAuthState = async (options: { 
  keepUserData?: boolean;
  preserveTheme?: boolean;
  signOut?: boolean;
} = {}): Promise<boolean> => {
  const { 
    keepUserData = false, 
    preserveTheme = true,
    signOut = true 
  } = options;
  
  try {
    console.log('Cleaning auth state with options:', options);
    
    // Items to preserve across reset
    const preservedKeys = preserveTheme ? ['theme', 'color-mode'] : [];
    if (keepUserData) {
      preservedKeys.push('user-preferences');
    }
    
    // Save items we want to keep
    const preservedItems: Record<string, string> = {};
    preservedKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) preservedItems[key] = value;
    });
    
    // Try to sign out from Supabase
    if (signOut) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('Supabase signOut successful');
      } catch (error) {
        console.warn('Error during signout - continuing with cleanup:', error);
      }
    }
    
    // Clear auth flags and markers
    resetAuthLoopState();
    resetCircuitBreaker();
    clearPauseRecoveryRequired();
    clearPauseDetected();
    resetRecoveryAttempts();
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear session storage items
    sessionStorage.removeItem('authAttempts');
    sessionStorage.removeItem('authDetectionPaused');
    
    // Restore preserved items
    Object.entries(preservedItems).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    console.log('Auth state cleanup successful');
    return true;
  } catch (error) {
    console.error('Failed to clean auth state:', error);
    return false;
  }
};

// NEW: Enhanced session testing with backoff
export const testSessionWithBackoff = async (
  initialDelayMs = 0, 
  maxAttempts = 3
): Promise<{ valid: boolean; session: any | null; error?: string }> => {
  // Start with optional delay to prevent hammering Supabase
  if (initialDelayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));
  }
  
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      console.log(`Testing session validity, attempt ${attempt + 1}/${maxAttempts}`);
      
      // Progressive backoff delay starting from the second attempt
      if (attempt > 0) {
        // Exponential backoff: 1s, 3s, 7s...
        const backoffMs = Math.pow(2, attempt) * 500;
        console.log(`Backing off for ${backoffMs}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn(`Session test failed with error:`, error);
        attempt++;
        continue;
      }
      
      if (!data?.session) {
        console.log('No session found');
        return { valid: false, session: null };
      }
      
      // Check if the session is valid
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = data.session.expires_at;
      
      if (expiresAt && expiresAt < now) {
        console.log('Session expired');
        return { valid: false, session: null, error: 'Session expired' };
      }
      
      console.log('Session is valid');
      return { valid: true, session: data.session };
      
    } catch (error) {
      console.error(`Unexpected error in attempt ${attempt + 1}:`, error);
      attempt++;
    }
  }
  
  return {
    valid: false,
    session: null,
    error: `Failed to validate session after ${maxAttempts} attempts`
  };
};

/**
 * Activates the circuit breaker to temporarily disable auth checks
 * @param minutes Number of minutes to disable auth checks
 * @param reason Reason for activation
 */
export const activateCircuitBreaker = (minutes: number = 5, reason: string = 'Unknown'): void => {
  // Skip during pause recovery to avoid conflicts
  if (isPauseRecoveryRequired()) {
    console.log('Pause recovery in progress - skipping circuit breaker activation');
    return;
  }
  
  console.warn(`Activating auth circuit breaker for ${minutes} minutes. Reason: ${reason}`);
  
  const expiryTime = Date.now() + (minutes * 60 * 1000);
  const circuitBreakerData = {
    active: true,
    expiry: expiryTime,
    reason: reason,
    activated: Date.now()
  };
  
  localStorage.setItem('auth-circuit-breaker', JSON.stringify(circuitBreakerData));
};

/**
 * Check if the circuit breaker is active
 */
export const isCircuitBreakerActive = (): { 
  active: boolean; 
  reason?: string; 
  remainingSeconds?: number;
} => {
  // Skip during pause recovery to avoid conflicts
  if (isPauseRecoveryRequired()) {
    return { active: false };
  }
  
  const circuitBreakerJson = localStorage.getItem('auth-circuit-breaker');
  
  if (!circuitBreakerJson) {
    return { active: false };
  }
  
  try {
    const circuitBreaker = JSON.parse(circuitBreakerJson);
    const now = Date.now();
    
    // Check if the circuit breaker is still active
    if (circuitBreaker.expiry > now) {
      const remainingSeconds = Math.floor((circuitBreaker.expiry - now) / 1000);
      return { 
        active: true, 
        reason: circuitBreaker.reason,
        remainingSeconds
      };
    } else {
      // Clear expired circuit breaker
      localStorage.removeItem('auth-circuit-breaker');
      return { active: false };
    }
  } catch (e) {
    // If there's an error parsing the circuit breaker data, reset it
    localStorage.removeItem('auth-circuit-breaker');
    return { active: false };
  }
};

/**
 * Reset the circuit breaker
 */
export const resetCircuitBreaker = (): void => {
  localStorage.removeItem('auth-circuit-breaker');
  console.info('🔓 Circuit breaker reset');
};

/**
 * Track authentication errors
 * Returns the current error count
 */
export const trackAuthError = (): number => {
  const currentCount = parseInt(localStorage.getItem('auth-error-count') || '0', 10);
  const newCount = currentCount + 1;
  localStorage.setItem('auth-error-count', newCount.toString());
  
  return newCount;
};

/**
 * Reset the auth error counter
 */
export const resetAuthErrorCount = (): void => {
  localStorage.setItem('auth-error-count', '0');
};

// NEW: Enhanced recovery with backoff for Supabase pause scenarios
export const performFullAuthRecovery = async (): Promise<void> => {
  try {
    console.log('Performing full auth recovery...');
    
    // Increment recovery attempts
    const attempts = incrementRecoveryAttempts();
    console.log(`Recovery attempt ${attempts}`);
    
    // First add delay to prevent hammering during recovery
    // Exponential backoff based on attempt number
    const backoffDelay = Math.min(attempts * 1000, 5000);
    console.log(`Using backoff delay of ${backoffDelay}ms before recovery attempt`);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    // Check service availability with retry
    let isServiceAvailable = false;
    for (let i = 0; i < 3; i++) {
      isServiceAvailable = await probeSupabaseService();
      if (isServiceAvailable) break;
      // Wait 1s between probes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Supabase service availability: ${isServiceAvailable ? 'OK' : 'NOT RESPONDING'}`);
    
    // If service is available, clear pause recovery flags
    if (isServiceAvailable) {
      clearPauseRecoveryRequired();
      clearPauseDetected();
      resetAuthLoopState();
    }
    
    // Clean up all auth state
    await cleanAuthState();
    
    console.log('Auth recovery completed successfully');
  } catch (error) {
    console.error('Failed to perform auth recovery:', error);
    throw error;
  }
};

/**
 * Emergency auth reset - nuclear option that clears all storage
 */
export const emergencyAuthReset = (): void => {
  try {
    console.warn('Performing emergency auth reset (clearing all storage)');
    
    // Clear all of localStorage (except critical items)
    const itemsToPreserve = ['theme', 'color-mode'];
    const preservedItems: Record<string, string> = {};
    
    // Save items we want to keep
    itemsToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) preservedItems[key] = value;
    });
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore preserved items
    Object.entries(preservedItems).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    console.log('Emergency auth reset completed');
    
    // Reload page to ensure clean state
    window.location.reload();
  } catch (error) {
    console.error('Failed to perform emergency reset:', error);
    throw error;
  }
};

/**
 * Initialize pause/unpause detection with enhanced recovery logic
 */
export const initPauseUnpauseDetection = (): void => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  let lastActivity = Date.now();
  let wasHidden = false;
  
  // Handle document visibility changes (tab switching, etc)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      wasHidden = true;
      lastActivity = Date.now();
    } else if (wasHidden) {
      const now = Date.now();
      const timeDiff = now - lastActivity;
      
      // If hidden for more than 30 seconds, mark as paused
      if (timeDiff > 30000) {
        localStorage.setItem('pause_detected', 'true');
        
        // If the pause was very long (5+ minutes), mark for special recovery
        if (timeDiff > 300000) {
          console.warn(`App was inactive for ${Math.round(timeDiff / 1000)}s, marking for special recovery`);
          markPauseRecoveryRequired();
        } else {
          console.log(`App was in background for ${Math.round(timeDiff / 1000)}s, marking as paused`);
        }
        
        // Schedule an automatic probe after returning from pause/background
        setTimeout(async () => {
          const isAvailable = await probeSupabaseService();
          if (isAvailable) {
            console.log('Auto-probe after pause: Supabase is available, clearing pause flags');
            clearPauseDetected();
            clearPauseRecoveryRequired();
            resetAuthLoopState();
          } else {
            console.warn('Auto-probe after pause: Supabase still unavailable');
            // Schedule a second probe after 3 seconds
            setTimeout(async () => {
              const secondAttempt = await probeSupabaseService();
              if (secondAttempt) {
                console.log('Second auto-probe successful, clearing pause flags');
                clearPauseDetected();
                clearPauseRecoveryRequired();
                resetAuthLoopState();
              }
            }, 3000);
          }
        }, 1000);
      }
      
      wasHidden = false;
    }
  });
  
  // Also track page focus/blur events
  window.addEventListener('blur', () => {
    wasHidden = true;
    lastActivity = Date.now();
  });
  
  window.addEventListener('focus', () => {
    if (wasHidden) {
      const now = Date.now();
      const timeDiff = now - lastActivity;
      
      // If hidden for more than 30 seconds, mark as paused
      if (timeDiff > 30000) {
        localStorage.setItem('pause_detected', 'true');
        
        // If the pause was very long (5+ minutes), mark for special recovery
        if (timeDiff > 300000) {
          console.warn(`App was unfocused for ${Math.round(timeDiff / 1000)}s, marking for special recovery`);
          markPauseRecoveryRequired();
        } else {
          console.log(`App was unfocused for ${Math.round(timeDiff / 1000)}s, marking as paused`);
        }
        
        // Schedule an automatic probe after returning from focus loss
        setTimeout(async () => {
          const isAvailable = await probeSupabaseService();
          if (isAvailable) {
            console.log('Auto-probe after focus return: Supabase is available, clearing pause flags');
            clearPauseDetected();
            clearPauseRecoveryRequired();
            resetAuthLoopState();
          } else {
            console.warn('Auto-probe after focus return: Supabase still unavailable');
            // Add a second probe after 3 seconds
            setTimeout(async () => {
              const secondAttempt = await probeSupabaseService();
              if (secondAttempt) {
                console.log('Second auto-probe successful, clearing pause flags');
                clearPauseDetected();
                clearPauseRecoveryRequired();
                resetAuthLoopState();
              }
            }, 3000);
          }
        }, 1000);
      }
      
      wasHidden = false;
    }
  });

  // Run a service probe on page load to check Supabase availability
  setTimeout(async () => {
    try {
      const isServiceAvailable = await probeSupabaseService();
      console.log(`Initial Supabase service check: ${isServiceAvailable ? 'OK' : 'NOT RESPONDING'}`);
      
      if (!isServiceAvailable) {
        console.warn('Supabase service not responding on initial check - may be in paused state');
        markPauseRecoveryRequired();
      } else {
        // If service is available, clear any lingering pause flags
        clearPauseRecoveryRequired();
        clearPauseDetected();
        resetAuthLoopState();
      }
    } catch (error) {
      console.error('Error during initial Supabase service probe:', error);
    }
  }, 1000);
  
  // Set up periodic probe to check if Supabase is back after pause
  if (isPauseRecoveryRequired() || wasPauseDetected()) {
    console.log('Setting up recurring probe for Supabase availability check');
    const probeInterval = setInterval(async () => {
      if (isPauseRecoveryRequired() || wasPauseDetected()) {
        const isAvailable = await probeSupabaseService();
        if (isAvailable) {
          console.log('Recurring probe: Supabase is available, clearing pause flags');
          clearPauseDetected();
          clearPauseRecoveryRequired();
          resetAuthLoopState();
          clearInterval(probeInterval);
        }
      } else {
        clearInterval(probeInterval);
      }
    }, 5000); // Check every 5 seconds
    
    // Clean up interval after 2 minutes max to prevent memory leaks
    setTimeout(() => clearInterval(probeInterval), 120000);
  }
};

/**
 * Checks if a pause was detected
 */
export const wasPauseDetected = (): boolean => {
  return localStorage.getItem('pause_detected') === 'true';
};

/**
 * Clears the pause detected flag
 */
export const clearPauseDetected = (): void => {
  localStorage.removeItem('pause_detected');
};

/**
 * Set force bypass mode to skip auth checks
 * @param durationMs optional duration in ms (defaults to 4 hours)
 */
export const setForceBypass = (durationMs: number = 14400000): void => {
  const expiresAt = Date.now() + durationMs;
  localStorage.setItem('force_bypass', expiresAt.toString());
};

/**
 * Check if force bypass mode is active
 */
export const isForceBypassActive = (): boolean => {
  const bypass = localStorage.getItem('force_bypass');
  if (!bypass) return false;
  
  const expiresAt = parseInt(bypass, 10);
  const now = Date.now();
  
  // If expired, clear it
  if (now > expiresAt) {
    localStorage.removeItem('force_bypass');
    return false;
  }
  
  return true;
};

// Keep track of recovery attempts to prevent loops
const RECOVERY_ATTEMPTS_KEY = 'auth_recovery_attempts';

/**
 * Check if too many recovery attempts have been made
 */
export const hasTooManyRecoveryAttempts = (): boolean => {
  const attempts = parseInt(localStorage.getItem(RECOVERY_ATTEMPTS_KEY) || '0', 10);
  return attempts >= 3;
};

/**
 * Increment recovery attempts counter
 */
export const incrementRecoveryAttempts = (): number => {
  const attempts = parseInt(localStorage.getItem(RECOVERY_ATTEMPTS_KEY) || '0', 10);
  const newAttempts = attempts + 1;
  localStorage.setItem(RECOVERY_ATTEMPTS_KEY, newAttempts.toString());
  return newAttempts;
};

/**
 * Reset recovery attempts counter
 */
export const resetRecoveryAttempts = (): void => {
  localStorage.setItem(RECOVERY_ATTEMPTS_KEY, '0');
};

/**
 * Resets all auth recovery state
 */
export const resetAuthRecovery = (): void => {
  sessionStorage.removeItem('authAttempts');
  sessionStorage.removeItem('authDetectionPaused');
  localStorage.removeItem('pause_detected');
  localStorage.removeItem('force_bypass');
  localStorage.removeItem(RECOVERY_ATTEMPTS_KEY);
  clearPauseRecoveryRequired();
};

/**
 * Tests the session with progressive retries
 * @returns an object with status and session data if available
 */
export const testSessionWithRetries = async (maxRetries = 3): Promise<{
  valid: boolean;
  session: any | null;
  error?: string;
}> => {
  let attempts = 0;
  let lastError: any = null;
  
  while (attempts < maxRetries) {
    try {
      // Progressive backoff delay - 0ms, 1000ms, 3000ms
      if (attempts > 0) {
        const backoffMs = attempts === 1 ? 1000 : 3000;
        console.log(`Backing off for ${backoffMs}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      console.log(`Testing session validity, attempt ${attempts + 1}/${maxRetries}`);
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        lastError = error;
        console.warn(`Session test error on attempt ${attempts + 1}:`, error);
        attempts++;
        continue;
      }
      
      if (!data.session) {
        console.log('No session found in getSession response');
        return { valid: false, session: null };
      }
      
      // Additional validation
      const user = data.session.user;
      const expiresAt = data.session.expires_at;
      
      if (!user) {
        console.log('Session missing user information');
        return { valid: false, session: null, error: 'Session missing user data' };
      }
      
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt < now) {
          console.log('Session is expired');
          return { valid: false, session: null, error: 'Session expired' };
        }
      }
      
      console.log('Session is valid');
      // If we get a valid session, clear any pause recovery flags
      clearPauseRecoveryRequired();
      clearPauseDetected();
      resetAuthLoopState();
      return { valid: true, session: data.session };
    } catch (error) {
      lastError = error;
      console.error(`Unexpected error testing session on attempt ${attempts + 1}:`, error);
      attempts++;
    }
  }
  
  // All attempts failed
  return {
    valid: false,
    session: null,
    error: lastError ? String(lastError) : 'Failed to test session after multiple attempts'
  };
};

// Fix missing function: Add the required clearPauseRecoveryRequired function
export const clearPauseRecoveryRequired = (): void => {
  localStorage.removeItem("pause_recovery_active");
  console.log('Pause recovery flag cleared');
};

// Fix missing function: Add the markPauseRecoveryRequired function 
export const markPauseRecoveryRequired = (): void => {
  localStorage.setItem("pause_recovery_active", "true");
  console.log('Pause recovery flag set');
};

// Fix missing function: Check if pause recovery is required
export const isPauseRecoveryRequired = (): boolean => {
  return localStorage.getItem("pause_recovery_active") === "true";
};

// Re-export these functions from supabase/client.ts so that modules importing from authRecovery can use them
// export { isPauseRecoveryRequired, clearPauseRecoveryRequired, markPauseRecoveryRequired } from "@/integrations/supabase/client";
