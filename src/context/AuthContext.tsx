
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  supabase, 
  clearAuthState, 
  isAuthVersionCurrent, 
  trackAuthError, 
  resetAuthErrorCount,
  activateCircuitBreaker,
  isCircuitBreakerActive,
  resetCircuitBreaker
} from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
        
        // If we have retries left, try again after a delay
        if (retryAttempt < MAX_AUTH_RETRIES) {
          console.log(`Retrying profile fetch in ${(retryAttempt + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 1000));
          return fetchProfile(userId, retryAttempt + 1);
        }
        
        return null;
      }
      
      if (data) {
        const mappedProfile = mapDbProfileToUserProfile(data);
        resetAuthErrorCount(); // Reset error count on successful fetch
        return mappedProfile;
      }
      
      return null;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      
      // If we have retries left, try again after a delay
      if (retryAttempt < MAX_AUTH_RETRIES) {
        console.log(`Retrying profile fetch after exception in ${(retryAttempt + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 1000));
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
    
    try {
      // Full reset of auth state
      await clearAuthState();
      
      // Reset circuit breaker
      resetCircuitBreaker();
      
      // Reset error counts
      resetAuthErrorCount();
      
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
    if (isCircuitBreakerActive()) {
      console.log("Circuit breaker is active, skipping auth initialization");
      setAuthState('ERROR');
      setAuthError("Authentication temporarily disabled due to repeated errors. Please try again later.");
      setLoading(false);
      return;
    }
    
    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
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
              }
            } else {
              console.error('Failed to fetch profile for user:', currentSession.user.id);
              const errorCount = trackAuthError();
              
              setAuthState('SIGNED_IN');
              
              // If we've had too many errors, activate circuit breaker
              if (errorCount >= MAX_AUTH_ERRORS) {
                console.warn("Too many auth errors, activating circuit breaker");
                activateCircuitBreaker(5); // 5 minutes timeout
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
    
    // Check for existing session with retry logic
    const checkSession = async (attempt = 0) => {
      try {
        console.log(`Checking session, attempt ${attempt + 1}`);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          
          if (attempt < MAX_AUTH_RETRIES) {
            console.log(`Retrying session check in ${(attempt + 1) * 1000}ms...`);
            setTimeout(() => checkSession(attempt + 1), (attempt + 1) * 1000);
            return;
          }
          
          setAuthState('SIGNED_OUT');
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          const fetchedProfile = await fetchProfile(data.session.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
            setAuthState('AUTHENTICATED');
            resetAuthErrorCount();
          } else {
            const errorCount = trackAuthError();
            setAuthState('SIGNED_IN');
            
            if (errorCount >= MAX_AUTH_ERRORS) {
              console.warn("Too many auth errors, activating circuit breaker");
              activateCircuitBreaker(5);
              setAuthError("Authentication temporarily disabled due to repeated errors");
              setAuthState('ERROR');
            }
          }
        } else {
          setAuthState('SIGNED_OUT');
        }
      } catch (error) {
        console.error('Session check exception:', error);
        setAuthState('SIGNED_OUT');
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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

  // Sign in with email and password - with enhanced error handling
  const signIn = async (email: string, password: string) => {
    // Reset circuit breaker on explicit sign in attempt
    resetCircuitBreaker();
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        // Track auth errors for explicit sign in attempts too
        trackAuthError();
        return { error };
      }
      
      return { error: null };
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
