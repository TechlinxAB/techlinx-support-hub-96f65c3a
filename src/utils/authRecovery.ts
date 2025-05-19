
/**
 * Simple auth recovery utilities to help with authentication edge cases
 */

// Flag to track if app was paused/resumed
let pauseDetected = false;

/**
 * Initialize pause/unpause detection to handle potential token expiration during app pause
 */
export const initPauseUnpauseDetection = () => {
  // Set up listener for visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pauseDetected = true;
      console.log('App resumed from background, flagging potential token refresh need');
    }
  });
};

/**
 * Check if a pause was detected
 */
export const wasPauseDetected = () => pauseDetected;

/**
 * Clear the pause detected flag
 */
export const clearPauseDetected = () => {
  pauseDetected = false;
};

/**
 * Check for active bypass flag in localStorage
 */
export const isForceBypassActive = () => {
  return localStorage.getItem('auth-bypass-active') === 'true';
};

/**
 * Set a force bypass flag
 */
export const setForceBypass = () => {
  localStorage.setItem('auth-bypass-active', 'true');
};

/**
 * Clear all auth related items from localStorage for a clean slate
 */
export const performFullAuthRecovery = async () => {
  try {
    localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
    localStorage.removeItem('auth-bypass-active');
    return true;
  } catch (error) {
    console.error('Failed to perform auth recovery:', error);
    return false;
  }
};
