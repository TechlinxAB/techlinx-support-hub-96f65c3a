
import { clearAuthState, resetCircuitBreaker } from '@/integrations/supabase/client';

/**
 * Comprehensive authentication recovery utilities
 * These functions help recover from various auth-related issues
 */

/**
 * Full authentication recovery process
 * This is a "nuclear option" that completely resets the authentication state
 */
export const performFullAuthRecovery = async (): Promise<boolean> => {
  console.log('Starting full authentication recovery process...');
  
  try {
    // Step 1: Reset circuit breaker if it's active
    resetCircuitBreaker();
    
    // Step 2: Clear all auth state (tokens, sessions, etc.)
    await clearAuthState();
    
    // Step 3: Force page reload if needed
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
      return true;
    }
    
    console.log('✅ Authentication recovery complete');
    return true;
  } catch (error) {
    console.error('❌ Authentication recovery failed:', error);
    
    // Last resort - try to clear storage directly
    try {
      localStorage.clear();
      sessionStorage.clear();
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
  
  // Check for rapid redirects (potential auth loop)
  const redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0', 10);
  const lastRedirect = parseInt(sessionStorage.getItem('last_redirect') || '0', 10);
  const now = Date.now();
  
  // If we've had 3+ redirects in under 10 seconds, likely an auth loop
  if (redirectCount > 3 && (now - lastRedirect) < 10000) {
    return true;
  }
  
  // Update redirect counter for next check
  sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
  sessionStorage.setItem('last_redirect', now.toString());
  
  // Reset counter after 20 seconds of no redirects
  setTimeout(() => {
    sessionStorage.setItem('redirect_count', '0');
  }, 20000);
  
  return hasErrorParam;
};

/**
 * Emergency recovery function - clears all browser storage
 * Use this as a last resort if other methods fail
 */
export const emergencyAuthReset = (): void => {
  console.log("Performing emergency auth reset...");
  
  try {
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
    
    // Force reload to auth page
    window.location.href = '/auth';
  } catch (e) {
    console.error("Emergency reset failed:", e);
    alert("Emergency reset failed. Please clear your browser data manually and reload.");
  }
};
