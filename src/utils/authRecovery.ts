import { supabase } from "@/integrations/supabase/client";

/**
 * Detects potential auth loops by tracking login attempts
 * @returns true if an auth loop is detected
 */
export const detectAuthLoops = (): boolean => {
  try {
    // Get current time
    const now = Date.now();
    
    // Get auth attempts from session storage
    const authAttempts = JSON.parse(sessionStorage.getItem('authAttempts') || '[]');
    
    // Add current attempt
    authAttempts.push(now);
    
    // Keep only attempts from the last minute
    const recentAttempts = authAttempts.filter((time: number) => now - time < 60000);
    
    // Store updated attempts
    sessionStorage.setItem('authAttempts', JSON.stringify(recentAttempts));
    
    // If there are more than 5 attempts in the last minute, it's probably a loop
    return recentAttempts.length > 5;
  } catch (error) {
    console.error('Error detecting auth loops:', error);
    return false;
  }
};

/**
 * Checks if the current auth token might be stale
 * @returns true if the token might be stale
 */
export const isTokenPotentiallyStale = (): boolean => {
  try {
    const session = supabase.auth.session();
    if (!session) return false;
    
    // If the token expires in less than 10 minutes, consider it stale
    const expiresAt = session.expires_at;
    if (!expiresAt) return false;
    
    const expirationDate = new Date(expiresAt * 1000);
    const now = new Date();
    
    // If token expires in less than 10 minutes, it's considered stale
    return (expirationDate.getTime() - now.getTime()) < 600000;
  } catch (error) {
    console.error('Error checking token staleness:', error);
    return false;
  }
};

/**
 * Pauses auth detection temporarily
 */
export const pauseAuthDetection = (): void => {
  sessionStorage.setItem('authDetectionPaused', 'true');
};

/**
 * Unpauses auth detection
 */
export const unpauseAuthDetection = (): void => {
  sessionStorage.removeItem('authDetectionPaused');
};

/**
 * Checks if auth detection is currently paused
 * @returns true if auth detection is paused
 */
export const isAuthDetectionPaused = (): boolean => {
  return sessionStorage.getItem('authDetectionPaused') === 'true';
};

/**
 * Resets all auth recovery state
 */
export const resetAuthRecovery = (): void => {
  sessionStorage.removeItem('authAttempts');
  sessionStorage.removeItem('authDetectionPaused');
};
