
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, clearAuthState } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import NavigationService from '@/services/navigationService';

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

// Impersonated profile interface for admin functionality
export interface ImpersonatedProfile extends UserProfile {
  originalUserId?: string;
}

// Define auth context type with all necessary properties
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  // Required properties for existing components
  isImpersonating: boolean;
  impersonatedProfile: ImpersonatedProfile | null;
  startImpersonation?: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  authState: 'INITIAL_SESSION' | 'RESTORING_SESSION' | 'AUTHENTICATED' | 'SIGNED_OUT';
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
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<ImpersonatedProfile | null>(null);
  const [authState, setAuthState] = useState<'INITIAL_SESSION' | 'RESTORING_SESSION' | 'AUTHENTICATED' | 'SIGNED_OUT'>('INITIAL_SESSION');
  
  // Simple derived state
  const isAuthenticated = !!session && !!user;
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect URL from query parameters if we're on the auth page
  const isAuthPage = location.pathname === '/auth';
  
  // Function to fetch user profile
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching profile:', error);
        toast.error("Could not load profile data", {
          description: "You are logged in, but profile information couldn't be retrieved."
        });
        return null;
      }
      
      if (data) {
        return mapDbProfileToUserProfile(data);
      }
      
      return null;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      toast.error("Error loading profile", {
        description: "An unexpected error occurred while loading your profile."
      });
      return null;
    }
  };

  // Centralized redirect handler
  const handleAuthRedirect = () => {
    if (!isAuthenticated) return;
    
    // First check sessionStorage for stored redirect URL 
    const storedRedirectUrl = NavigationService.getStoredRedirectUrl();
    console.log('AuthContext: Checking stored redirect URL:', storedRedirectUrl);
    
    if (storedRedirectUrl && storedRedirectUrl !== '/') {
      console.log('AuthContext: Redirecting to stored URL:', storedRedirectUrl);
      
      // Clear the stored URL to prevent future redirects
      NavigationService.clearStoredRedirectUrl();
      
      // Use NavigationService to handle the redirect
      NavigationService.navigate(storedRedirectUrl, { replace: true });
      return;
    }
    
    // If we're on the auth page with no stored URL, redirect to home
    if (isAuthPage) {
      console.log('AuthContext: No specific redirect found, redirecting to home');
      NavigationService.navigate('/', { replace: true });
    }
  };

  // Initialize auth state with clean approach
  useEffect(() => {
    setAuthState('RESTORING_SESSION');
    setLoading(true);
    
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', event);
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        setAuthState('AUTHENTICATED');
        
        // Use setTimeout to avoid potential conflicts with Supabase client
        setTimeout(async () => {
          try {
            const fetchedProfile = await fetchProfile(currentSession.user.id);
            
            if (fetchedProfile) {
              setProfile(fetchedProfile);
            }
          } catch (err) {
            console.error('Error in profile fetch:', err);
          } finally {
            setLoading(false);
            
            // After authentication is complete and loading is done,
            // handle redirects if needed
            handleAuthRedirect();
          }
        }, 0);
      } else {
        setAuthState('SIGNED_OUT');
        setProfile(null);
        setLoading(false);
      }
    });
    
    // Check for existing session
    const initSession = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthState('SIGNED_OUT');
          setLoading(false);
          return;
        }
        
        if (!existingSession) {
          setAuthState('SIGNED_OUT');
          setLoading(false);
          
          // If on protected route, redirect to auth
          if (!isAuthPage) {
            console.log('No session, redirecting from', location.pathname, 'to auth');
            navigate('/auth');
          }
          return;
        }
        
        // We have a session, update state
        setSession(existingSession);
        setUser(existingSession.user);
        setAuthState('AUTHENTICATED');
        
        // Try to fetch profile
        if (existingSession.user) {
          const fetchedProfile = await fetchProfile(existingSession.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          }
        }
        
        setLoading(false);
        
        // Once authenticated and loaded, handle redirect
        handleAuthRedirect();
      } catch (err) {
        console.error('Error in session init:', err);
        setAuthState('SIGNED_OUT');
        setLoading(false);
      }
    };
    
    initSession();
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Sign in with email and password - enhanced implementation with redirect handling
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Sign in error:', error);
        toast.error("Authentication failed", { 
          description: error.message || "Please check your credentials and try again."
        });
        setLoading(false);
        return { error };
      }
      
      // On successful sign in, update session and user
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        setAuthState('AUTHENTICATED');
        
        // Try to fetch profile
        if (data.session.user) {
          const fetchedProfile = await fetchProfile(data.session.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          }
        }
        
        toast.success("Successfully signed in!");
        
        // Let the handleAuthRedirect function handle the redirect
        // after the auth state change is processed
      }
      
      setLoading(false);
      return { error: null };
    } catch (err) {
      console.error('Exception during sign in:', err);
      toast.error("Authentication error", { 
        description: "An unexpected error occurred. Please try again."
      });
      setLoading(false);
      return { error: err };
    }
  };

  // Enhanced sign out implementation for resilience
  const signOut = async () => {
    try {
      setLoading(true);
      
      // First, ensure client state is cleared which is most important
      // This guarantees we always clean up the client side state
      await clearAuthState();
      
      // Then attempt the server-side signout, but it's okay if this fails
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.log('Server-side signOut returned error (expected in some cases):', err);
        // Continue regardless of error since we've already cleared local state
      }
      
      // Clear state
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthState('SIGNED_OUT');
      
      toast.success("You have been signed out");
      
      // Redirect to auth page
      navigate('/auth');
    } catch (err) {
      console.error('Unexpected error in signOut:', err);
      toast.error("Sign out encountered an error", {
        description: "But your session has been cleared locally."
      });
      
      // Even on critical error, attempt one more state clear
      setSession(null);
      setUser(null);
      setProfile(null);
      setAuthState('SIGNED_OUT');
      
      // Force a page redirect as last resort
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  // Stub impersonation methods to satisfy TypeScript
  const startImpersonation = async (userId: string) => {
    toast.info("Impersonation is not implemented yet");
  };

  const endImpersonation = async () => {
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    toast.info("Impersonation session ended");
  };

  // Create auth context value
  const value = {
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
