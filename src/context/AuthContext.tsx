import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  supabase, 
  clearAuthState, 
  isAuthVersionCurrent, 
  trackAuthError, 
  resetAuthErrorCount,
  activateCircuitBreaker,
  isCircuitBreakerActive,
  resetCircuitBreaker,
  recordSuccessfulAuth,
  STORAGE_KEY,
  validateTokenIntegrity,
  isPauseRecoveryRequired,
  markPauseRecoveryRequired,
  resetAuthLoopState
} from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { probeSupabaseService, testSessionWithRetries } from '@/utils/authRecovery';

// Define user profile type
export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: 'consultant' | 'user';
  companyId: string | null;
  preferredLanguage: string;
  avatar?: string | null;
  phone?: string | null;
};

export type AuthState = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'AUTHENTICATED' | 'IMPERSONATING' | 'ERROR' | 'RECOVERY';

// Define auth context type with all necessary properties
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  
  // Added impersonation properties
  isImpersonating: boolean;
  impersonatedProfile: UserProfile | null;
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  
  // Added authState property
  authState: AuthState;
  
  // Added recovery functions
  forceRecovery: () => Promise<void>;
  authError: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Error constants
const MAX_AUTH_ERRORS = 3;
const MAX_AUTH_RETRIES = 2;

// Map database profile to our UserProfile type
const mapDbProfileToUserProfile = (dbProfile: any): UserProfile => {
  if (!dbProfile) return null as unknown as UserProfile;
  
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    name: dbProfile.name,
    role: dbProfile.role,
    companyId: dbProfile.company_id,
    preferredLanguage: dbProfile.preferred_language,
    avatar: dbProfile.avatar,
    phone: dbProfile.phone,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('INITIAL_SESSION');
  const [retryCount, setRetryCount] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);
  const [resetAttempts, setResetAttempts] = useState(0);
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  
  // Simple derived state
  const isAuthenticated = !!session && !!user;

  // Function to fetch user profile with retry logic
  const fetchProfile = async (userId: string, retryAttempt = 0): Promise<UserProfile | null> => {
    try {
      console.log(`Attempting to fetch profile for ${userId}, attempt ${retryAttempt + 1}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching profile:', error);
        
        // Check if this might be due to Supabase being paused
        if (retryAttempt === 0) {
          const serviceAvailable = await probeSupabaseService();
          if (!serviceAvailable) {
            console.warn('Supabase service may be paused - marking for recovery');
            markPauseRecoveryRequired();
          }
        }
        
        // If we have retries left, try again after a delay
        if (retryAttempt < MAX_AUTH_RETRIES) {
          // Enhanced exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryAttempt) * 1000;
          console.log(`Retrying profile fetch in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchProfile(userId, retryAttempt + 1);
        }
        
        return null;
      }
      
      if (data) {
        const mappedProfile = mapDbProfileToUserProfile(data);
        resetAuthErrorCount(); // Reset error count on successful fetch
        recordSuccessfulAuth(); // Record a successful auth action
        resetAuthLoopState(); // Reset loop detection
        return mappedProfile;
      }
      
      return null;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      
      // If we have retries left, try again after a delay
      if (retryAttempt < MAX_AUTH_RETRIES) {
        // Enhanced exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryAttempt) * 1000;
        console.log(`Retrying profile fetch after exception in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfile(userId, retryAttempt + 1);
      }
      
      return null;
    }
  };

  // Force recovery function - nuclear option to reset auth state
  const forceRecovery = async () => {
    setLoading(true);
    setAuthState('RECOVERY');
    setAuthError(null);
    
    // Track reset attempts to prevent endless recovery loops
    const newResetCount = resetAttempts + 1;
    setResetAttempts(newResetCount);
    
    // If we've tried too many times, show error and stop trying
    if (newResetCount >= 3) {
      toast.error("Multiple recovery attempts have failed", {
        description: "Please try clearing your browser cache and cookies manually."
      });
      setAuthState('ERROR');
      setAuthError("Recovery failed after multiple attempts. Please clear your browser cache manually.");
      setLoading(false);
      return;
    }
    
    try {
      // First check if service is available
      const isServiceAvailable = await probeSupabaseService();
      console.log(`Service availability check: ${isServiceAvailable ? 'OK' : 'NOT RESPONDING'}`);
      
      // Full reset of auth state
      await clearAuthState();
      
      // Reset circuit breaker
      resetCircuitBreaker();
      
      // Reset error counts
      resetAuthErrorCount();
      resetAuthLoopState();
      
      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsImpersonating(false);
      setImpersonatedProfile(null);
      setOriginalProfile(null);
      
      toast.success("Authentication reset successful", {
        description: "Please log in again to continue."
      });
      
      // Set as signed out
      setAuthState('SIGNED_OUT');
    } catch (err) {
      console.error('Recovery failed:', err);
      setAuthError("Recovery failed. Please try clearing your browser cache and cookies.");
      toast.error("Authentication reset failed", {
        description: "Please try clearing your browser cache and cookies."
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state with improved error handling
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    
    console.log('Initializing AuthContext');
    setLoading(true);
    
    // Check for version mismatch first
    if (!isAuthVersionCurrent()) {
      console.log("Auth version mismatch detected, performing cleanup");
      clearAuthState().then(() => {
        console.log("Auth state cleared due to version mismatch");
      });
    }
    
    // Check if circuit breaker is active
    if (isCircuitBreakerActive().active) {
      console.log("Circuit breaker is active, skipping auth initialization");
      setAuthState('ERROR');
      setAuthError("Authentication temporarily disabled due to repeated errors. Please try again later.");
      setLoading(false);
      return;
    }
    
    // Set up auth listener with improved error handling
    let authSubscription: { subscription: { unsubscribe: () => void } } | null = null;
    
    try {
      // Set up auth listener
      authSubscription = supabase.auth.onAuthStateChange((event, currentSession) => {
        console.log('Auth state changed:', event, currentSession ? 'Session exists' : 'No session');
        
        // Update session and user state
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            try {
              const fetchedProfile = await fetchProfile(currentSession.user.id);
              
              if (fetchedProfile) {
                setProfile(fetchedProfile);
                
                // If not impersonating, update auth state
                if (!isImpersonating) {
                  setAuthState('AUTHENTICATED');
                  console.log('Profile fetch successful, user authenticated');
                  resetAuthErrorCount(); // Reset error counter on success
                  recordSuccessfulAuth(); // Record successful auth
                  resetAuthLoopState(); // Reset loop detection
                }
              } else {
                console.error('Failed to fetch profile for user:', currentSession.user.id);
                const errorCount = trackAuthError();
                
                setAuthState('SIGNED_IN');
                
                // If we've had too many errors, activate circuit breaker
                if (errorCount >= MAX_AUTH_ERRORS) {
                  console.warn("Too many auth errors, activating circuit breaker");
                  activateCircuitBreaker(5, "Failed to fetch user profile"); // 5 minutes timeout
                  setAuthError("Authentication temporarily disabled due to repeated errors");
                  setAuthState('ERROR');
                }
              }
            } catch (err) {
              console.error('Error in profile fetch:', err);
              setAuthState('SIGNED_IN');
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setAuthState('SIGNED_OUT');
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Failed to set up auth listener:', error);
      setAuthState('ERROR');
      setAuthError("Failed to initialize authentication");
      setLoading(false);
    }
    
    // Enhanced session check with retry logic and improved token validation
    const checkSession = async () => {
      // Skip if already done or we already have a session
      if (sessionCheckDone || session) return;
      
      setSessionCheckDone(true);
      
      // FIX 5: Prevent duplicate session restoration in AuthContext.tsx
      if (session || authState === 'AUTHENTICATED') {
        console.log('Session already initialized, skipping checkSession.');
        return;
      }

      // Check for pause recovery flag and handle it here
      if (isPauseRecoveryRequired()) {
        console.warn('Pause recovery flag detected. Forcing full auth reset.');
        await clearAuthState();
        setAuthState('SIGNED_OUT');
        setLoading(false);
        return;
      }
      
      // First validate token integrity without making API calls
      if (!validateTokenIntegrity()) {
        console.warn('No valid auth token in storage, skipping session check.');
        setAuthState('SIGNED_OUT');
        setLoading(false);
        return;
      }
      
      try {
        console.log(`Checking session, attempt 1`);
        
        // Use our enhanced session test with retries and exponential backoff
        const result = await testSessionWithRetries(3);
        
        if (result.valid && result.session) {
          console.log('Session test successful, valid session found');
          
          // Update session and user
          setSession(result.session);
          setUser(result.session.user || null);
          
          if (result.session.user) {
            // Only fetch profile if we haven't done so already
            if (!profile) {
              const fetchedProfile = await fetchProfile(result.session.user.id);
              if (fetchedProfile) {
                setProfile(fetchedProfile);
                setAuthState('AUTHENTICATED');
                resetAuthErrorCount();
                recordSuccessfulAuth(); // Record successful auth
                resetAuthLoopState(); // Reset loop detection
              } else {
                const errorCount = trackAuthError();
                setAuthState('SIGNED_IN');
                
                if (errorCount >= MAX_AUTH_ERRORS) {
                  console.warn("Too many auth errors, activating circuit breaker");
                  activateCircuitBreaker(5, "Failed to fetch user profile during session check");
                  setAuthError("Authentication temporarily disabled due to repeated errors");
                  setAuthState('ERROR');
                }
              }
            }
          } else {
            setAuthState('SIGNED_OUT');
          }
        } else {
          console.warn('Session test failed:', result.error);
          setAuthState('SIGNED_OUT');
        }
      } catch (error) {
        console.error('Session check exception:', error);
        setAuthState('SIGNED_OUT');
      } finally {
        setLoading(false);
      }
    };
    
    // Defer session check slightly to avoid race conditions
    setTimeout(checkSession, 300); // Increased from 100ms to 300ms
    
    return () => {
      // Clean up subscription
      if (authSubscription?.subscription?.unsubscribe) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [initialized, profile, isImpersonating, sessionCheckDone, session, authState]);

  // Start impersonation function
  const startImpersonation = async (userId: string) => {
    if (isImpersonating) {
      throw new Error("Already impersonating a user");
    }
    
    setLoading(true);
    
    try {
      // Store original profile
      setOriginalProfile(profile);
      
      // Fetch the user to impersonate
      const impersonatedUser = await fetchProfile(userId);
      
      if (!impersonatedUser) {
        throw new Error("Failed to fetch impersonated user profile");
      }
      
      // Set impersonation state
      setImpersonatedProfile(impersonatedUser);
      setProfile(impersonatedUser);
      setIsImpersonating(true);
      setAuthState('IMPERSONATING');
      
      toast.success("Now viewing as impersonated user", {
        description: `You are now viewing as ${impersonatedUser.name || impersonatedUser.email}`
      });
    } catch (error: any) {
      toast.error("Failed to start impersonation", {
        description: error.message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // End impersonation function
  const endImpersonation = async () => {
    if (!isImpersonating || !originalProfile) {
      throw new Error("Not currently impersonating");
    }
    
    setLoading(true);
    
    try {
      // Restore original profile
      setProfile(originalProfile);
      setIsImpersonating(false);
      setImpersonatedProfile(null);
      setAuthState('AUTHENTICATED');
      
      toast.success("Returned to original account", {
        description: `You are now back as ${originalProfile.name || originalProfile.email}`
      });
    } catch (error: any) {
      toast.error("Failed to end impersonation", {
        description: error.message
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password - with enhanced error handling and retry logic
  const signIn = async (email: string, password: string) => {
    // Reset circuit breaker on explicit sign in attempt
    resetCircuitBreaker();
    resetAuthLoopState();
    
    try {
      // Attempt to sign in with backoff on failure
      let attempts = 0;
      let lastError: any = null;
      
      while (attempts < 2) { // Max 2 retries (3 attempts total)
        try {
          if (attempts > 0) {
            // Backoff delay: 1s then 2s
            const delay = attempts * 1000;
            console.log(`Login retry ${attempts + 1} after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const { data, error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
          });
          
          if (error) {
            lastError = error;
            attempts++;
            continue;
          }
          
          // Mark as authenticated to trigger the useEffect that handles redirection
          if (data?.session) {
            recordSuccessfulAuth();
            resetAuthLoopState();
            
            // Ensure state is updated
            setSession(data.session);
            setUser(data.session.user || null);
            setAuthState('AUTHENTICATED');
            
            // Fetch profile immediately to speed up the process
            if (data.session.user) {
              setTimeout(async () => {
                const fetchedProfile = await fetchProfile(data.session.user.id);
                if (fetchedProfile) {
                  setProfile(fetchedProfile);
                }
              }, 0);
            }
          }
          
          return { error: null };
        } catch (err) {
          lastError = err;
          attempts++;
        }
      }
      
      // If we reach here, all attempts failed
      trackAuthError();
      return { error: lastError };
    } catch (err) {
      trackAuthError();
      return { error: err };
    }
  };

  // Sign out with enhanced error handling
  const signOut = async () => {
    // If impersonating, end impersonation first
    if (isImpersonating) {
      await endImpersonation();
    }
    
    try {
      // Use the enhanced clearAuthState function
      const success = await clearAuthState();
      
      if (!success) {
        console.warn("Standard sign out failed, forcing hard reset");
        await forceRecovery();
      }
      
      // State will be updated by the auth listener
    } catch (err) {
      console.error('Error signing out:', err);
      
      // Force recovery as a last resort
      await forceRecovery();
    }
  };

  // Create auth context value
  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated,
    isImpersonating,
    impersonatedProfile,
    startImpersonation,
    endImpersonation,
    authState,
    forceRecovery,
    authError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Add export for resetAuthLoopState
export { resetAuthLoopState } from '@/utils/authRecovery';
