
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase, resetAuthState, forceSignOut } from '@/integrations/supabase/client';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Update the context type definition to include originalProfile and impersonation methods
export type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  originalProfile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
  isImpersonating: boolean;
  impersonatedProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, data?: object) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  resetAuth: () => Promise<void>;
};

// Keep the UserProfile type
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

// Maximum time to wait for auth loading before forcing completion
const MAX_AUTH_LOADING_TIME = 8000; // 8 seconds - increased to allow for longer loading

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  
  // Prevent redundant profile fetches
  const fetchingProfileRef = useRef<{[key: string]: boolean}>({});
  const profileFetchAttempts = useRef<{[key: string]: number}>({});

  // Reset auth state (for troubleshooting auth issues)
  const resetAuth = useCallback(async () => {
    try {
      await resetAuthState();
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsImpersonating(false);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      setProfileLoaded(false);
      
      toast.success('Authentication state has been reset');
      
      // Force reload the page to ensure clean state
      window.location.href = '/auth?reset=complete';
    } catch (err) {
      console.error('Failed to reset auth state:', err);
      toast.error('Failed to reset authentication state');
    }
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email and password');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        setError(error);
      } else {
        console.log('Sign in successful');
      }
      return { error };
    } catch (err) {
      console.error('Exception during sign in:', err);
      return { error: err as AuthError };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, data?: object) => {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data
        }
      });
      if (error) setError(error);
      return { error };
    } catch (err) {
      console.error('Error signing up:', err);
      return { error: err as AuthError };
    }
  };

  // Sign out - Enhanced with fallbacks
  const signOut = async () => {
    try {
      console.log('Attempting to sign out');
      
      // First clear local state to prevent any UI flicker
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsImpersonating(false);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      setProfileLoaded(false);
      
      // First clear storage directly for reliability
      try {
        localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      } catch (e) {
        console.log('Error accessing localStorage during signOut:', e);
      }
      
      // Then try the normal sign out API
      await supabase.auth.signOut();
      
      console.log('Sign out completed and state reset');
    } catch (err) {
      console.error('Error during normal sign out:', err);
      
      // Even if the normal signout fails, ensure state is reset
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsImpersonating(false);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      setProfileLoaded(false);
      
      try {
        // Last resort: force sign out that directly cleans localStorage
        const result = await forceSignOut();
        if (result.success) {
          console.log('Forced sign out succeeded after normal sign out failed');
        } else {
          throw new Error('Both normal and forced sign out failed');
        }
      } catch (forceErr) {
        console.error('Critical error: Even forced sign out failed:', forceErr);
        throw forceErr;
      }
    }
  };

  // Start impersonation
  const startImpersonation = async (userId: string) => {
    try {
      // Store the original profile before impersonating
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
      setIsImpersonating(true);
      const mappedProfile = mapDbProfileToUserProfile(data);
      setImpersonatedProfile(mappedProfile);
      setProfile(mappedProfile);
      
      toast.success(`Now viewing as ${data.name || data.email}`);
    } catch (error: any) {
      console.error('Error starting impersonation:', error);
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
      setIsImpersonating(false);
      setImpersonatedProfile(null);
      
      toast.success('Returned to your account');
    } catch (error: any) {
      console.error('Error ending impersonation:', error);
      toast.error('Failed to end impersonation', {
        description: error.message
      });
      throw error;
    }
  };

  // Fetch user profile with retry mechanism and timeout handling
  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    // Use ref to track if we're already fetching profile for this user
    if (fetchingProfileRef.current[userId]) {
      console.log(`Already fetching profile for user ${userId}`);
      return;
    }
    
    // Track profile fetch attempts
    if (!profileFetchAttempts.current[userId]) {
      profileFetchAttempts.current[userId] = 0;
    }
    profileFetchAttempts.current[userId]++;
    
    // Prevent excessive retries
    if (profileFetchAttempts.current[userId] > 5) {
      console.error(`Excessive profile fetching attempts for user ${userId}`);
      setProfileLoaded(true); // Mark as loaded to exit loading state
      return;
    }
    
    try {
      console.log('Fetching profile for user:', userId);
      fetchingProfileRef.current[userId] = true;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      fetchingProfileRef.current[userId] = false;
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      if (data) {
        console.log('Profile data received:', data.email);
        setProfile(mapDbProfileToUserProfile(data));
        setProfileLoaded(true);
      } else {
        console.log('No profile found for user:', userId);
        // If no profile is found and we have retries left, try again after a delay
        if (retryCount < 3) {
          console.log(`Retrying profile fetch (${retryCount + 1}/3) in 1 second...`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
          return; // Exit without marking profile as loaded yet
        }
        setProfile(null);
        setProfileLoaded(true);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
      fetchingProfileRef.current[userId] = false;
      
      // If we have retries left, try again after a delay
      if (retryCount < 3) {
        console.log(`Retrying profile fetch (${retryCount + 1}/3) in 1 second...`);
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
        return; // Exit without marking profile as loaded yet
      }
      // Mark profile as loaded even on error to prevent infinite loading
      setProfileLoaded(true);
    }
  }, []);

  // Listen for auth changes - with improved error handling and deadlock prevention
  useEffect(() => {
    console.log('Setting up authentication state');
    setLoading(true);
    
    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Auth loading timeout reached, forcing completion');
      if (!authInitialized) {
        setLoading(false);
        setAuthInitialized(true);
      }
    }, MAX_AUTH_LOADING_TIME);
    
    // Set up auth listener but use setTimeout to defer Supabase calls to avoid potential deadlocks
    let subscription: { unsubscribe: () => void } | null = null;
    
    setTimeout(() => {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          // Use setTimeout to avoid Supabase SDK deadlock when callback logic triggers more auth operations
          setTimeout(() => {
            console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Use setTimeout again to defer the profile fetch to avoid Supabase SDK deadlock
              setTimeout(() => {
                fetchProfile(session.user.id);
              }, 0);
            } else {
              setProfile(null);
              setProfileLoaded(true);
              setLoading(false);
            }
            
            // Mark auth as initialized
            if (!authInitialized) {
              setAuthInitialized(true);
            }
          }, 0);
        });
        
        subscription = data.subscription;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 0);
    
    // Check for existing session - wrapped in setTimeout to avoid potential deadlock
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Initial session check:', session ? 'Session found' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to defer the profile fetch to avoid Supabase SDK deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
          
          // Mark auth as initialized
          if (!authInitialized) {
            setAuthInitialized(true);
          }
        }
      }).catch(err => {
        console.error('Error during initial session check:', err);
        setLoading(false);
        setProfileLoaded(true);
        
        // Mark auth as initialized
        if (!authInitialized) {
          setAuthInitialized(true);
        }
      });
    }, 100); // Small delay to ensure auth listener is set up first
    
    return () => {
      clearTimeout(loadingTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfile, authInitialized]);
  
  // Update loading state when profile is loaded
  useEffect(() => {
    if (user === null || profileLoaded) {
      setLoading(false);
    }
  }, [user, profileLoaded]);

  const value = {
    user,
    session,
    profile,
    originalProfile,
    loading,
    error,
    isImpersonating,
    impersonatedProfile,
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
