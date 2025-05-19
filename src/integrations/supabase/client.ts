
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
const CURRENT_AUTH_VERSION = '1.0.3'; // Increment this when making breaking changes to auth logic

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
  resetAuthErrorCount();
}

/**
 * Track auth state initialization to detect potential issues
 */
export function trackAuthInitialization(): number {
  // Check if we've had too many initializations in a short period
  const lastInit = parseInt(localStorage.getItem(AUTH_LAST_INIT_KEY) || '0', 10);
  const now = Date.now();
  const timeSinceLast = now - lastInit;
  
  // If less than 1 second between inits, that's suspicious
  if (lastInit > 0 && timeSinceLast < 1000) {
    const initCount = parseInt(localStorage.getItem(AUTH_INIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(AUTH_INIT_COUNT_KEY, initCount.toString());
    localStorage.setItem(AUTH_LAST_INIT_KEY, now.toString());
    
    // If too many rapid initializations, activate circuit breaker
    if (initCount > 5) {
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
  // FIX 4: Patch circuit breaker logic to ignore pause recovery  
  if (localStorage.getItem('pause_recovery_required') === 'true') return;
  
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
 * Clear all authentication state
 */
export async function clearAuthState(): Promise<boolean> {
  try {
    console.log('Clearing auth state...');
    
    // Sign out from Supabase
    await supabase.auth.signOut({ scope: 'global' });
    
    // Reset error counter and circuit breaker
    resetAuthErrorCount();
    resetCircuitBreaker();
    
    // Reset auth version to force re-check on next init
    localStorage.removeItem(AUTH_VERSION_KEY);
    
    // Special handling for auth token
    localStorage.removeItem(STORAGE_KEY);
    
    console.log('Auth state cleared successfully');
    return true;
  } catch (e) {
    console.error('Failed to clear auth state:', e);
    return false;
  }
}
