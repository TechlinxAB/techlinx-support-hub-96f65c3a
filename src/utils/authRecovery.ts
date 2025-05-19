
import { clearAuthState, resetCircuitBreaker as resetSupabaseCircuitBreaker, isCircuitBreakerActive as checkCircuitBreakerActive, supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive authentication recovery utilities
 * These functions help recover from various auth-related issues
 */

// Re-export the circuit breaker functions
export const resetCircuitBreaker = resetSupabaseCircuitBreaker;
export const isCircuitBreakerActive = checkCircuitBreakerActive;

// PAUSE/UNPAUSE DETECTION
const PAUSE_THRESHOLD_MS = 30000; // 30 seconds threshold to consider a long pause
const LAST_ACTIVE_KEY = 'auth-last-active';
const PAUSE_DETECTED_KEY = 'auth-pause-detected';
const FORCE_BYPASS_KEY = 'auth-force-bypass';
const RECOVERY_ATTEMPT_KEY = 'auth-recovery-attempt-count';

/**
 * Track when the app becomes visible (returns from background)
 * This helps detect potential Supabase project pause/unpause scenarios
 */
export const initPauseUnpauseDetection = (): void => {
  // Record current timestamp as last active
  try {
    sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch (e) {
    // Silent fail
  }
  
  // Set up visibility change listener to detect potential pause/unpause scenarios
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const lastActive = parseInt(sessionStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      
      // If app was invisible for more than threshold, mark as potential pause/unpause
      if (lastActive > 0 && (now - lastActive > PAUSE_THRESHOLD_MS)) {
        console.log(`⚠️ Potential pause/unpause detected after ${Math.round((now - lastActive)/1000)}s inactive`);
        
        // Set pause detected flag
        sessionStorage.setItem(PAUSE_DETECTED_KEY, 'true');
        
        // New code: Instead of redirecting here, we set a flag for AuthContext to handle
        console.warn('Supabase was paused and resumed. Setting flag for auth recovery.');
        localStorage.setItem('pause_recovery_required', 'true');
        
        // Execute this in an IIFE to use async/await
        (async () => {
          try {
            // Sign out from Supabase
            await supabase.auth.signOut();
            
            // Clear storage but don't redirect - AuthContext will handle this
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.clear();
          } catch (e) {
            console.error('Error during pause recovery:', e);
          }
        })();
        
        // Automatically reset the circuit breaker when returning from long pause
        resetCircuitBreaker();
      }
      
      // Update last active time
      sessionStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    }
  });
};

/**
 * Check if we've detected a potential pause/unpause scenario
 * This helps adapt auth behavior to be more forgiving after service disruptions
 */
export const wasPauseDetected = (): boolean => {
  return sessionStorage.getItem(PAUSE_DETECTED_KEY) === 'true';
};

/**
 * Clear the pause detection flag
 */
export const clearPauseDetected = (): void => {
  sessionStorage.removeItem(PAUSE_DETECTED_KEY);
};

/**
 * Set the force bypass flag to completely skip authentication checks
 * @param duration Duration in milliseconds to keep the bypass active
 */
export const setForceBypass = (duration: number = 300000): void => {
  // Default to 5 minutes bypass duration
  const expiry = Date.now() + duration;
  localStorage.setItem(FORCE_BYPASS_KEY, expiry.toString());
  console.log(`🔓 Force bypass activated until ${new Date(expiry).toLocaleTimeString()}`);
};

/**
 * Check if force bypass is active
 */
export const isForceBypassActive = (): boolean => {
  const expiry = parseInt(localStorage.getItem(FORCE_BYPASS_KEY) || '0', 10);
  const isActive = expiry > Date.now();
  
  // Auto-clean expired bypass
  if (expiry > 0 && !isActive) {
    localStorage.removeItem(FORCE_BYPASS_KEY);
  }
  
  return isActive;
};

/**
 * Detect potential authentication loops by analyzing redirects
 * @returns Information about detected auth loops
 */
export const detectAuthLoops = (): boolean => {
  // Check for rapid redirects (potential auth loop)
  const redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0', 10);
  const lastRedirect = parseInt(sessionStorage.getItem('last_redirect') || '0', 10);
  const now = Date.now();
  
  // IMPROVEMENTS:
  // 1. Much more lenient detection: require 10+ redirects in under 10 seconds to trigger
  // 2. Be even more lenient if we've detected a pause/unpause scenario
  const redirectThreshold = wasPauseDetected() ? 15 : 10;
  const timeThreshold = wasPauseDetected() ? 15000 : 10000;
  
  if (redirectCount > redirectThreshold && (now - lastRedirect) < timeThreshold) {
    console.log(`Auth loop detected: ${redirectCount} redirects in ${now - lastRedirect}ms`);
    return true;
  }
  
  // Update redirect counter for next check
  sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
  sessionStorage.setItem('last_redirect', now.toString());
  
  // Reset counter after 60 seconds of no redirects (increased from 30)
  setTimeout(() => {
    sessionStorage.setItem('redirect_count', '0');
  }, 60000);
  
  return false;
};

/**
 * Track recovery attempts to prevent infinite recovery loops
 */
const trackRecoveryAttempt = (): number => {
  const attempts = parseInt(sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) || '0', 10);
  const newCount = attempts + 1;
  sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, newCount.toString());
  return newCount;
};

/**
 * Reset recovery attempt counter
 */
export const resetRecoveryAttempts = (): void => {
  sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
};

/**
 * Check if we've tried recovery too many times already
 */
export const hasTooManyRecoveryAttempts = (): boolean => {
  return parseInt(sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) || '0', 10) >= 3;
};

/**
 * Full authentication recovery process
 * This is a "nuclear option" that completely resets the authentication state
 */
export const performFullAuthRecovery = async (): Promise<boolean> => {
  console.log('Starting full authentication recovery process...');
  
  // Track recovery attempts to prevent infinite loops
  const recoveryCount = trackRecoveryAttempt();
  if (recoveryCount > 5) {
    console.log("⚠️ Too many recovery attempts, activating force bypass");
    setForceBypass(3600000); // 1 hour bypass
    return false;
  }
  
  try {
    // Step 1: Reset circuit breaker
    resetCircuitBreaker();
    
    // Step 2: Clear auth state through Supabase client
    await clearAuthState();
    
    // Step 3: More aggressive direct clearing of storage
    try {
      // Clear all localStorage items
      for (const key of Object.keys(localStorage)) {
        // Be very thorough in clearing auth-related items
        if (key.includes('auth') || 
            key.includes('supabase') || 
            key.includes('sb-') ||
            key.includes('session') ||
            key.includes('token')) {
          localStorage.removeItem(key);
        }
      }
      
      // Specifically target known auth keys
      localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      localStorage.removeItem('auth-token-version');
      localStorage.removeItem('auth-error-count');
      localStorage.removeItem('auth-circuit-breaker');
      localStorage.removeItem('auth-init-count');
      localStorage.removeItem('auth-last-init');
      localStorage.removeItem('last-session-check');
      localStorage.removeItem('last-successful-auth');
      localStorage.removeItem('pause_recovery_required');
      
      // Also clear force bypass in recovery
      localStorage.removeItem(FORCE_BYPASS_KEY);
      
      // Clear ALL sessionStorage (more aggressive)
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    } catch (e) {
      console.error("Failed to clear storage directly:", e);
    }
    
    // Step 4: Reset redirect counters
    sessionStorage.setItem('redirect_count', '0');
    sessionStorage.setItem('last_redirect', '0');
    clearPauseDetected();
    
    // Step 5: Force page reload with delay to prevent immediate auth loop
    if (window.location.pathname !== '/auth') {
      // Add a small delay to let things settle
      await new Promise(resolve => setTimeout(resolve, 300));
      // Use cache-busting parameter in URL
      window.location.href = `/auth?recovery=${Date.now()}`;
      return true;
    }
    
    console.log('✅ Authentication recovery complete');
    return true;
  } catch (error) {
    console.error('❌ Authentication recovery failed:', error);
    
    // Last resort - try to clear storage directly again
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // With longer delay for last resort
      setTimeout(() => {
        window.location.href = '/auth?emergency=' + Date.now();
      }, 500);
      
      return true;
    } catch (e) {
      // Nothing else we can do
      return false;
    }
  }
};

/**
 * Detect potential authentication problems by analyzing the URL and errors
 * @returns True if problems are detected
 */
export const detectAuthProblems = (): boolean => {
  // Check for error states in URL (for OAuth redirects)
  const urlParams = new URLSearchParams(window.location.search);
  const hasErrorParam = urlParams.has('error') || urlParams.has('error_description');
  
  // If returning from pause/unpause, be more lenient
  if (wasPauseDetected()) {
    // Only count as problem if we have explicit error params
    return hasErrorParam;
  }
  
  return hasErrorParam || detectAuthLoops();
};

/**
 * Emergency recovery function - clears all browser storage
 * Use this as a last resort if other methods fail
 */
export const emergencyAuthReset = (): void => {
  console.log("Performing emergency auth reset...");
  
  try {
    // First try to sign out through supabase
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.signOut({ scope: 'global' })
        .catch(e => console.error("Sign out failed:", e));
    });
    
    // Clear localStorage
    localStorage.clear();
    console.log("LocalStorage cleared");
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log("SessionStorage cleared");
    
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    console.log("Cookies cleared");
    
    // Activate force bypass for 30 minutes
    setForceBypass(30 * 60 * 1000);
    
    // Force reload to auth page with cache busting parameter
    window.location.href = '/auth?reset=' + Date.now();
  } catch (e) {
    console.error("Emergency reset failed:", e);
    alert("Emergency reset failed. Please clear your browser data manually and reload.");
  }
};
