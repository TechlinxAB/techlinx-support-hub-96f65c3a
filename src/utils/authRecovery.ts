
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
 * Validate that a Supabase token is properly formed and not corrupted
 * @param token The token string to validate
 * @returns True if the token appears valid
 */
export const isTokenValid = (token: string): boolean => {
  if (!token) return false;
  
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to parse the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check for required JWT fields
    if (!payload.exp || !payload.iat || !payload.sub) {
      return false;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return false;
    }
    
    return true;
  } catch (e) {
    // If we can't parse the token, it's invalid
    return false;
  }
};

/**
 * Check stored tokens for corruption
 */
export const checkStoredTokens = (): { valid: boolean; issue?: string } => {
  try {
    const storageKey = 'sb-uaoeabhtbynyfzyfzogp-auth-token';
    const tokenData = localStorage.getItem(storageKey);
    
    if (!tokenData) {
      return { valid: false, issue: 'No token found in storage' };
    }
    
    try {
      const parsed = JSON.parse(tokenData);
      
      if (!parsed.access_token || !parsed.refresh_token) {
        return { valid: false, issue: 'Missing required token fields' };
      }
      
      if (!isTokenValid(parsed.access_token)) {
        return { valid: false, issue: 'Access token is invalid' };
      }
      
      return { valid: true };
    } catch (e) {
      return { valid: false, issue: 'Token data is corrupted and cannot be parsed' };
    }
  } catch (e) {
    return { valid: false, issue: 'Exception checking tokens' };
  }
};

/**
 * Enhanced token refresh function that attempts to fix common issues
 */
export const attemptTokenRefresh = async (): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception during token refresh:', e);
    return false;
  }
};
