import { supabase } from "@/integrations/supabase/client";

// Techlinx test company name constant
export const TECHLINX_NAME = "Techlinx Solutions";

/**
 * Ensures that the Techlinx test company exists
 * @returns The company object
 */
export const ensureTechlinxCompanyExists = async () => {
  try {
    console.log("Checking if Techlinx company exists...");
    
    // Check if company already exists
    const { data: existingCompany, error: searchError } = await supabase
      .from("companies")
      .select("*")
      .eq("name", TECHLINX_NAME)
      .single();
    
    if (searchError && searchError.code !== "PGRST116") {
      console.error("Error searching for Techlinx:", searchError);
      throw searchError;
    }
    
    // If company exists, return it
    if (existingCompany) {
      console.log("Techlinx company already exists:", existingCompany);
      return existingCompany;
    }
    
    // Otherwise, create it
    console.log("Creating Techlinx test company...");
    
    const newCompany = {
      name: TECHLINX_NAME,
      logo: "/placeholder.svg",
      industry: "Technology",
      description: "A test company for demo purposes",
      website: "https://example.com",
      size: "50-100",
      // Remove createdAt and updatedAt fields - these might be managed by the database
    };
    
    const { data: createdCompany, error: createError } = await supabase
      .from("companies")
      .insert(newCompany)
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating Techlinx:", createError);
      throw createError;
    }
    
    console.log("Created Techlinx company:", createdCompany);
    return createdCompany;
  } catch (error) {
    console.error("Error in ensureTechlinxCompanyExists:", error);
    throw error;
  }
};

/**
 * Assigns a consultant to the Techlinx company
 * @param consultantId The ID of the consultant user
 * @param companyId The ID of the Techlinx company
 */
export const assignConsultantToTechlinx = async (consultantId: string, companyId: string) => {
  try {
    console.log(`Assigning consultant ${consultantId} to Techlinx company ${companyId}...`);
    
    // Update the user's company ID
    const { error } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", consultantId);
    
    if (error) {
      console.error("Error assigning consultant to Techlinx:", error);
      throw error;
    }
    
    console.log("Successfully assigned consultant to Techlinx");
  } catch (error) {
    console.error("Error in assignConsultantToTechlinx:", error);
    throw error;
  }
};

/**
 * Creates sample content for the Techlinx company
 * @param companyId The ID of the Techlinx company
 * @param userId The ID of the user creating the content
 */
export const createTechlinxSampleContent = async (companyId: string, userId: string) => {
  try {
    console.log(`Creating sample content for Techlinx company ${companyId}...`);
    
    // Check if sample content already exists
    const { data: existingCases } = await supabase
      .from("cases")
      .select("*")
      .eq("company_id", companyId)
      .limit(1);
    
    if (existingCases && existingCases.length > 0) {
      console.log("Sample content already exists for Techlinx");
      return;
    }
    
    // Create sample cases - make sure these field names match your database schema
    const sampleCases = [
      {
        title: "Configure SSO for our domain",
        description: "We need help setting up Single Sign-On for our company domain",
        status: "new",
        priority: "medium",
        company_id: companyId,
        user_id: userId,
        // Use fields that match your database schema
      },
      {
        title: "Dashboard showing stale data",
        description: "Our analytics dashboard appears to be showing data from last week",
        status: "ongoing",
        priority: "high",
        company_id: companyId,
        user_id: userId,
        // Use fields that match your database schema
      },
      {
        title: "Need to add new team member",
        description: "We have a new employee starting next week who needs access to the platform",
        status: "resolved",
        priority: "low",
        company_id: companyId,
        user_id: userId,
        // Use fields that match your database schema
      }
    ];
    
    const { error } = await supabase
      .from("cases")
      .insert(sampleCases);
    
    if (error) {
      console.error("Error creating sample cases:", error);
      throw error;
    }
    
    console.log("Successfully created sample content for Techlinx");
  } catch (error) {
    console.error("Error in createTechlinxSampleContent:", error);
    throw error;
  }
};

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
export const isTokenPotentiallyStale = async (): Promise<boolean> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return false;
    
    // If the token expires in less than 10 minutes, consider it stale
    const expiresAt = sessionData.session.expires_at;
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
 * Activates the circuit breaker to temporarily disable auth checks
 * @param minutes Number of minutes to disable auth checks
 * @param reason Reason for activation
 */
export const activateCircuitBreaker = (minutes: number = 5, reason: string = 'Unknown'): void => {
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

/**
 * Full auth recovery - performs a complete reset of auth state
 */
export const performFullAuthRecovery = async (): Promise<void> => {
  try {
    console.log('Performing full auth recovery...');
    
    // Sign out from Supabase
    await supabase.auth.signOut({ scope: 'global' });
    
    // Reset error counter and circuit breaker
    resetAuthErrorCount();
    resetCircuitBreaker();
    
    // Clear auth-related storage items
    localStorage.removeItem('auth-token-version');
    localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
    
    // Clear session storage items
    sessionStorage.removeItem('authAttempts');
    sessionStorage.removeItem('authDetectionPaused');
    
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
 * Initialize pause/unpause detection
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
        console.log(`App was in background for ${Math.round(timeDiff / 1000)}s, marking as paused`);
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
        console.log(`App was unfocused for ${Math.round(timeDiff / 1000)}s, marking as paused`);
      }
      
      wasHidden = false;
    }
  });
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
 * Keep track of recovery attempts to prevent loops
 */
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
};
