
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export type AuthState = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'AUTHENTICATED' | 'IMPERSONATING';

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  
  // Simple derived state
  const isAuthenticated = !!session && !!user;

  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        const mappedProfile = mapDbProfileToUserProfile(data);
        return mappedProfile;
      }
      
      return null;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('Initializing AuthContext');
    setLoading(true);
    
    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', authState, currentSession ? 'Session exists' : 'No session');
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          const fetchedProfile = await fetchProfile(currentSession.user.id);
          
          if (fetchedProfile) {
            setProfile(fetchedProfile);
            
            // If not impersonating, update auth state
            if (!isImpersonating) {
              setAuthState('AUTHENTICATED');
              console.log('Profile fetch successful, user authenticated');
            }
          } else {
            console.error('Failed to fetch profile for user:', currentSession.user.id);
            setAuthState('SIGNED_IN');
          }
          
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setAuthState('SIGNED_OUT');
        setLoading(false);
      }
    });
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          const fetchedProfile = await fetchProfile(data.session.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
            setAuthState('AUTHENTICATED');
          }
        } else {
          setAuthState('SIGNED_OUT');
        }
      } catch (error) {
        console.error('Session check error:', error);
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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  // Sign out
  const signOut = async () => {
    // If impersonating, end impersonation first
    if (isImpersonating) {
      await endImpersonation();
    }
    
    try {
      await supabase.auth.signOut();
      // State will be updated by the auth listener
    } catch (err) {
      console.error('Error signing out:', err);
      
      // Force clean local storage
      try {
        localStorage.removeItem('sb-uaoeabhtbynyfzyfzogp-auth-token');
      } catch (e) {
        // Silent fail
      }
      
      // Reset state
      setUser(null);
      setSession(null);
      setProfile(null);
      setAuthState('SIGNED_OUT');
      setIsImpersonating(false);
      setImpersonatedProfile(null);
      setOriginalProfile(null);
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
    authState
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
