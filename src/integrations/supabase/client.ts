
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

/**
 * Track and reset auth errors
 */

// Keys for local storage
const AUTH_ERROR_COUNT_KEY = 'auth-error-count';
const AUTH_CIRCUIT_BREAKER_KEY = 'auth-circuit-breaker';
const AUTH_VERSION_KEY = 'auth-token-version';
const AUTH_LAST_SUCCESS_KEY = 'last-successful-auth';
const AUTH_INIT_COUNT_KEY = 'auth-init-count';
const AUTH_LAST_INIT_KEY = 'auth-last-init';
const CURRENT_AUTH_VERSION = '1.0.5'; // Incremented for auth loop fix

// New pause recovery keys
const PAUSE_DETECTED_KEY = 'pause-detected-timestamp';
const PAUSE_RECOVERY_ATTEMPTS_KEY = 'pause-recovery-attempts';
const PAUSE_RECOVERY_REQUIRED_KEY = 'pause_recovery_required';
const PAUSE_RECOVERY_SUCCESS_KEY = 'pause_recovery_success';

/**
 * Check if the current auth version matches the stored version
 * This helps detect when auth logic has been updated and may need a reset
 */
export function isAuthVersionCurrent(): boolean {
  return localStorage.getItem(AUTH_VERSION_KEY) === CURRENT_AUTH_VERSION;
}

/**
 * Record a successful authentication action
 * This helps track when auth was last working correctly
 */
export function recordSuccessfulAuth(): void {
  localStorage.setItem(AUTH_LAST_SUCCESS_KEY, Date.now().toString());
  localStorage.setItem(AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
  localStorage.removeItem(PAUSE_DETECTED_KEY);
  localStorage.removeItem(PAUSE_RECOVERY_ATTEMPTS_KEY);
  localStorage.removeItem(PAUSE_RECOVERY_REQUIRED_KEY);
  localStorage.setItem(PAUSE_RECOVERY_SUCCESS_KEY, 'true');
  resetAuthErrorCount();
}

/**
 * Mark that pause recovery is required
 * Used when we detect specific Supabase pause/resume patterns
 */
export function markPauseRecoveryRequired(): void {
  localStorage.setItem(PAUSE_RECOVERY_REQUIRED_KEY, 'true');
  localStorage.removeItem(PAUSE_RECOVERY_SUCCESS_KEY);
  console.log('🚨 Marked pause recovery as required');
}

/**
 * Check if pause recovery is required
 */
export function isPauseRecoveryRequired(): boolean {
  return localStorage.getItem(PAUSE_RECOVERY_REQUIRED_KEY) === 'true';
}

/**
 * Clear pause recovery required flag
 */
export function clearPauseRecoveryRequired(): void {
  localStorage.removeItem(PAUSE_RECOVERY_REQUIRED_KEY);
  localStorage.setItem(PAUSE_RECOVERY_SUCCESS_KEY, 'true');
}

/**
 * Check if pause recovery was successful
 */
export function wasPauseRecoverySuccessful(): boolean {
  return localStorage.getItem(PAUSE_RECOVERY_SUCCESS_KEY) === 'true';
}

/**
 * Track auth state initialization to detect potential issues
 */
export function trackAuthInitialization(): number {
  // Check if we've had too many initializations in a short period
  const lastInit = parseInt(localStorage.getItem(AUTH_LAST_INIT_KEY) || '0', 10);
  const now = Date.now();
  const timeSinceLast = now - lastInit;
  
  // Increased threshold to 500ms to reduce false positives
  // If less than 500ms between inits, that's suspicious
  if (lastInit > 0 && timeSinceLast < 500) {
    const initCount = parseInt(localStorage.getItem(AUTH_INIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(AUTH_INIT_COUNT_KEY, initCount.toString());
    localStorage.setItem(AUTH_LAST_INIT_KEY, now.toString());
    
    // If too many rapid initializations, activate circuit breaker
    if (initCount > 10) { // Increased from 5 to 10
      activateCircuitBreaker(2, 'Too many rapid auth initializations');
      return initCount;
    }
    
    return initCount;
  }
  
  // Reset counter if sufficient time has passed
  if (timeSinceLast > 5000) {
    localStorage.setItem(AUTH_INIT_COUNT_KEY, '1');
  } else {
    const count = parseInt(localStorage.getItem(AUTH_INIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(AUTH_INIT_COUNT_KEY, count.toString());
  }
  
  localStorage.setItem(AUTH_LAST_INIT_KEY, now.toString());
  return parseInt(localStorage.getItem(AUTH_INIT_COUNT_KEY) || '1', 10);
}

/**
 * Track authentication errors
 * Returns the current error count
 */
export function trackAuthError(): number {
  const currentCount = parseInt(localStorage.getItem(AUTH_ERROR_COUNT_KEY) || '0', 10);
  const newCount = currentCount + 1;
  localStorage.setItem(AUTH_ERROR_COUNT_KEY, newCount.toString());
  
  return newCount;
}

/**
 * Reset the auth error counter
 */
export function resetAuthErrorCount(): void {
  localStorage.setItem(AUTH_ERROR_COUNT_KEY, '0');
}

/**
 * Activate the circuit breaker to temporarily disable auth checks
 * This prevents rapid auth failures from causing excessive API calls
 * @param minutes Number of minutes to disable auth checks
 * @param reason Reason for activation
 */
export function activateCircuitBreaker(minutes: number = 5, reason: string = 'Unknown'): void {
  // Special handling for pause recovery
  if (isPauseRecoveryRequired()) {
    console.log('Pause recovery required - not activating circuit breaker');
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
  
  localStorage.setItem(AUTH_CIRCUIT_BREAKER_KEY, JSON.stringify(circuitBreakerData));
}

/**
 * Check if the circuit breaker is active
 */
export function isCircuitBreakerActive(): { 
  active: boolean; 
  reason?: string; 
  remainingSeconds?: number;
} {
  // If pause recovery is required, override circuit breaker
  if (isPauseRecoveryRequired()) {
    return { 
      active: false 
    };
  }

  const circuitBreakerJson = localStorage.getItem(AUTH_CIRCUIT_BREAKER_KEY);
  
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
      localStorage.removeItem(AUTH_CIRCUIT_BREAKER_KEY);
      return { active: false };
    }
  } catch (e) {
    // If there's an error parsing the circuit breaker data, reset it
    localStorage.removeItem(AUTH_CIRCUIT_BREAKER_KEY);
    return { active: false };
  }
}

/**
 * Reset the circuit breaker
 */
export function resetCircuitBreaker(): void {
  localStorage.removeItem(AUTH_CIRCUIT_BREAKER_KEY);
}

/**
 * Validates token integrity - checks if the token exists and has proper format
 * Returns true if token appears valid (doesn't verify with server)
 */
export function validateTokenIntegrity(): boolean {
  try {
    const rawToken = localStorage.getItem(STORAGE_KEY);
    if (!rawToken) return false;
    
    // Basic check: try to parse the token data
    const tokenData = JSON.parse(rawToken);
    
    // Check if token has minimum required fields
    return !!(
      tokenData &&
      tokenData.access_token &&
      tokenData.refresh_token &&
      tokenData.expires_at
    );
  } catch (e) {
    console.error('Token validation failed:', e);
    return false;
  }
}

/**
 * Clear all authentication state
 */
export async function clearAuthState(): Promise<boolean> {
  try {
    console.log('Clearing auth state...');
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Supabase signOut successful');
    } catch (error) {
      console.warn('Error during Supabase signOut - continuing with cleanup:', error);
    }
    
    // Reset error counter and circuit breaker
    resetAuthErrorCount();
    resetCircuitBreaker();
    
    // Reset auth version to force re-check on next init
    localStorage.removeItem(AUTH_VERSION_KEY);
    
    // Special handling for auth token
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear pause recovery flags
    clearPauseRecoveryRequired();
    localStorage.removeItem(PAUSE_DETECTED_KEY);
    localStorage.removeItem(PAUSE_RECOVERY_ATTEMPTS_KEY);
    
    // Clear any auth loop detection state
    sessionStorage.removeItem('authAttempts');
    
    console.log('Auth state cleared successfully');
    return true;
  } catch (e) {
    console.error('Failed to clear auth state:', e);
    return false;
  }
}
