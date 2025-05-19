import { clearAuthState, resetCircuitBreaker as resetSupabaseCircuitBreaker, isCircuitBreakerActive as checkCircuitBreakerActive } from '@/integrations/supabase/client';

/**
 * Comprehensive authentication recovery utilities
 * These functions help recover from various auth-related issues
 */

// Re-export the circuit breaker functions
export const resetCircuitBreaker = resetSupabaseCircuitBreaker;
export const isCircuitBreakerActive = checkCircuitBreakerActive;

/**
 * Detect potential authentication loops by analyzing redirects
 * @returns Information about detected auth loops
 */
export const detectAuthLoops = (): boolean => {
  // Check for rapid redirects (potential auth loop)
  const redirectCount = parseInt(sessionStorage.getItem('redirect_count') || '0', 10);
  const lastRedirect = parseInt(sessionStorage.getItem('last_redirect') || '0', 10);
  const now = Date.now();
  
  // Make this more lenient: require 5+ redirects in under 5 seconds to trigger
  // This prevents false positives during normal navigation
  if (redirectCount > 5 && (now - lastRedirect) < 5000) {
    console.log(`Auth loop detected: ${redirectCount} redirects in ${now - lastRedirect}ms`);
    return true;
  }
  
  // Update redirect counter for next check
  sessionStorage.setItem('redirect_count', (redirectCount + 1).toString());
  sessionStorage.setItem('last_redirect', now.toString());
  
  // Reset counter after 30 seconds of no redirects (increased from 20)
  setTimeout(() => {
    sessionStorage.setItem('redirect_count', '0');
  }, 30000);
  
  return false;
};

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
    
    // Step 3: Clear any session cookies and local storage directly
    try {
      // Clear localStorage items individually to be thorough
      for (const key of Object.keys(localStorage)) {
        // Keep non-auth related items
        if (key.includes('auth') || key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      }
      
      // Specifically clear known auth keys
      localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      localStorage.removeItem('auth-token-version');
      localStorage.removeItem('auth-error-count');
      localStorage.removeItem('auth-circuit-breaker');
      localStorage.removeItem('auth-init-count');
      localStorage.removeItem('auth-last-init');
      localStorage.removeItem('last-session-check');
      localStorage.removeItem('last-successful-auth');
      
      // Clear all sessionStorage
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
    
    // Step 4: Reset redirect counters explicitly
    sessionStorage.setItem('redirect_count', '0');
    sessionStorage.setItem('last_redirect', '0');
    
    // Step 5: Force page reload if needed
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
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
      window.location.href = '/auth';
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
    
    // Force reload to auth page with cache busting parameter
    window.location.href = '/auth?reset=' + Date.now();
  } catch (e) {
    console.error("Emergency reset failed:", e);
    alert("Emergency reset failed. Please clear your browser data manually and reload.");
  }
};
