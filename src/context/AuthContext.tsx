import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
const MAX_AUTH_LOADING_TIME = 5000; // 5 seconds

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email and password');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsImpersonating(false);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
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

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
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
        console.log('Profile data received:', data.email);
        setProfile(mapDbProfileToUserProfile(data));
      } else {
        console.log('No profile found for user:', userId);
        setProfile(null);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
    }
  };

  // Listen for auth changes
  useEffect(() => {
    console.log('Setting up authentication state');
    setLoading(true);
    
    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Auth loading timeout reached, forcing completion');
      setLoading(false);
    }, MAX_AUTH_LOADING_TIME);
    
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // Update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // If we have a valid session and user, fetch the profile
        if (session?.user) {
          // Use setTimeout to defer the profile fetch to avoid Supabase SDK deadlock
          setTimeout(() => {
            fetchProfile(session.user!.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );
    
    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to defer the profile fetch to avoid Supabase SDK deadlock
        setTimeout(() => {
          fetchProfile(session.user!.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error during initial session check:', err);
      setLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

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
    endImpersonation
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
