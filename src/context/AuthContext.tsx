
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase, resetAuthState, forceSignOut, STORAGE_KEY } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import navigationService from '@/services/navigationService';

// Authentication state machine states
type AuthState = 
  | 'INITIALIZING' 
  | 'AUTHENTICATED' 
  | 'UNAUTHENTICATED' 
  | 'ERROR'
  | 'IMPERSONATING';

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: 'consultant' | 'user';
  companyId: string | null;
  preferredLanguage: string;
  phone?: string | null;
  createdAt?: string;
  avatar?: string | null;
};

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  originalProfile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
  isImpersonating: boolean;
  impersonatedProfile: UserProfile | null;
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, data?: object) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  resetAuth: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to map database fields to UserProfile type
const mapDbProfileToUserProfile = (dbProfile: any): UserProfile => {
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    name: dbProfile.name,
    role: dbProfile.role,
    companyId: dbProfile.company_id,
    preferredLanguage: dbProfile.preferred_language,
    phone: dbProfile.phone,
    createdAt: dbProfile.created_at,
    avatar: dbProfile.avatar,
  };
};

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Basic auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [error, setError] = useState<AuthError | null>(null);
  
  // Impersonation state
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  
  // Internal refs to prevent race conditions
  const isInitialized = useRef(false);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const profileFetchInProgress = useRef<Record<string, boolean>>({});
  const initializationTimeout = useRef<number | null>(null);
  const profileFetchDebounceTimer = useRef<number | null>(null);
  
  // Calculate loading state from auth state
  const loading = authState === 'INITIALIZING';
  const isImpersonating = authState === 'IMPERSONATING';

  // Reset auth state (for troubleshooting auth issues)
  const resetAuth = useCallback(async () => {
    try {
      // Clean up any existing listeners
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
        authSubscription.current = null;
      }
      
      // Reset all state
      setAuthState('INITIALIZING');
      
      await resetAuthState();
      
      // Reset all state values
      setUser(null);
      setSession(null);
      setProfile(null);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      setError(null);
      
      // Finally set unauthenticated state
      setAuthState('UNAUTHENTICATED');
      
      // Reset navigation tracking
      navigationService.resetTracking();
      
      toast.success('Authentication state has been reset');
      
      // Redirect to auth page
      navigationService.hardRedirect('/auth?reset=complete');
    } catch (err) {
      console.error('Failed to reset auth state:', err);
      setAuthState('ERROR');
      toast.error('Failed to reset authentication state');
      
      // Last resort - direct redirect
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    }
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      // Prevent race conditions by setting state first
      setAuthState('INITIALIZING');
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setError(error);
        setAuthState('UNAUTHENTICATED');
        return { error };
      }
      
      // Session will be picked up by the auth state listener
      return { error: null };
    } catch (err: any) {
      setError(err);
      setAuthState('UNAUTHENTICATED');
      return { error: err as AuthError };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, data?: object) => {
    try {
      setAuthState('INITIALIZING');
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data }
      });
      
      if (error) {
        setError(error);
        setAuthState('UNAUTHENTICATED');
      }
      
      return { error };
    } catch (err: any) {
      setError(err);
      setAuthState('UNAUTHENTICATED');
      return { error: err as AuthError };
    }
  };

  // Sign out - Enhanced with fallbacks
  const signOut = async () => {
    try {
      // First set state to avoid UI flicker
      setAuthState('INITIALIZING');
      
      // Reset internal state
      setUser(null);
      setSession(null);
      setProfile(null);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      
      // Clean storage with direct access - most reliable
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // Silent fail
      }
      
      // Then try the normal sign out API
      await supabase.auth.signOut();
      setAuthState('UNAUTHENTICATED');
    } catch (err) {
      try {
        // Last resort: force sign out
        await forceSignOut();
        setAuthState('UNAUTHENTICATED');
      } catch (forceErr) {
        setAuthState('ERROR');
        throw forceErr;
      }
    }
  };

  // Start impersonation
  const startImpersonation = async (userId: string) => {
    try {
      setAuthState('INITIALIZING');
      
      // Store the original profile
      setOriginalProfile(profile);
      
      // Get the impersonated user's profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('User not found');
      
      // Set impersonation state
      const mappedProfile = mapDbProfileToUserProfile(data);
      setImpersonatedProfile(mappedProfile);
      setProfile(mappedProfile);
      setAuthState('IMPERSONATING');
      
      toast.success(`Now viewing as ${data.name || data.email}`);
    } catch (error: any) {
      setAuthState(user ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
      toast.error('Failed to impersonate user', {
        description: error.message
      });
      throw error;
    }
  };

  // End impersonation
  const endImpersonation = async () => {
    try {
      if (!originalProfile) throw new Error('No original profile found');
      
      // Restore original profile
      setProfile(originalProfile);
      setImpersonatedProfile(null);
      setAuthState('AUTHENTICATED');
      
      toast.success('Returned to your account');
    } catch (error: any) {
      setAuthState(user ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
      toast.error('Failed to end impersonation', {
        description: error.message
      });
      throw error;
    }
  };

  // Debounced fetch user profile to prevent API hammering
  const debounceFetchProfile = useCallback((userId: string) => {
    // Clear any existing timer
    if (profileFetchDebounceTimer.current !== null) {
      window.clearTimeout(profileFetchDebounceTimer.current);
    }
    
    // Set new timer
    profileFetchDebounceTimer.current = window.setTimeout(() => {
      fetchProfile(userId);
    }, 300); // 300ms debounce
  }, []);

  // Fetch user profile with improved tracking to prevent race conditions
  const fetchProfile = useCallback(async (userId: string) => {
    // Skip if we're already fetching this profile
    if (profileFetchInProgress.current[userId]) {
      console.log('Profile fetch already in progress for', userId);
      return;
    }
    
    try {
      profileFetchInProgress.current[userId] = true;
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      if (data) {
        setProfile(mapDbProfileToUserProfile(data));
        // Set auth state to authenticated since we have a valid profile
        setAuthState('AUTHENTICATED');
        console.log('Profile fetch successful, user authenticated');
      } else {
        // Profile not found for this user ID
        setProfile(null);
        console.warn(`No profile found for user: ${userId}`);
        setAuthState('UNAUTHENTICATED');
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
      setAuthState('ERROR');
    } finally {
      profileFetchInProgress.current[userId] = false;
    }
  }, []);

  // Main auth initialization and listener setup
  useEffect(() => {
    // Skip if already initialized
    if (isInitialized.current) {
      return;
    }
    
    isInitialized.current = true;
    console.log('Initializing AuthContext');
    
    // Safety timeout to prevent infinite loading
    initializationTimeout.current = window.setTimeout(() => {
      if (authState === 'INITIALIZING') {
        console.log('Auth initialization timeout, forcing completion');
        setAuthState('UNAUTHENTICATED');
      }
    }, 6000); // 6 seconds timeout
    
    // Set up auth state listener
    const setupAuthListener = () => {
      try {
        // IMPORTANT: Set up the auth listener first
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          // Handle auth state changes
          console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
          
          // Simple state updates only - no API calls inside the callback
          setSession(session);
          setUser(session?.user ?? null);
          
          // Defer any API calls or complex state updates
          if (session?.user) {
            // Using setTimeout with 0ms delay moves this to the next tick
            // This is crucial to prevent deadlocks in the auth state
            setTimeout(() => {
              debounceFetchProfile(session.user.id);
            }, 0);
          } else {
            setTimeout(() => {
              setProfile(null);
              setAuthState('UNAUTHENTICATED');
            }, 0);
          }
        });
        
        authSubscription.current = data.subscription;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setAuthState('ERROR');
      }
    };
    
    // Check for existing session after listener is set up
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Defer profile fetch to avoid potential deadlock
          setTimeout(() => {
            debounceFetchProfile(session.user.id);
          }, 0);
        } else {
          // No session, set state to unauthenticated
          setAuthState('UNAUTHENTICATED');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setAuthState('UNAUTHENTICATED');
      }
    };
    
    // Run setup in specific order with small delays to prevent race conditions
    setupAuthListener();
    
    // Small delay before checking session
    setTimeout(() => {
      checkExistingSession();
    }, 100);
    
    // Clean up on unmount
    return () => {
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
      
      if (initializationTimeout.current !== null) {
        clearTimeout(initializationTimeout.current);
      }
      
      if (profileFetchDebounceTimer.current !== null) {
        clearTimeout(profileFetchDebounceTimer.current);
      }
    };
  }, [debounceFetchProfile]);

  // Create the context value
  const value: AuthContextType = {
    user,
    session,
    profile,
    originalProfile,
    loading,
    error,
    isImpersonating,
    impersonatedProfile,
    authState,
    signIn,
    signUp,
    signOut,
    setProfile,
    startImpersonation,
    endImpersonation,
    resetAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
