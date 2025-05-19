
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

// Define auth context type with all necessary properties
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Simple derived state
  const isAuthenticated = !!session && !!user;
  const navigate = useNavigate();

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

  // Initialize auth state with clean approach
  useEffect(() => {
    if (authInitialized) return;
    
    console.log('Initializing AuthContext');
    setLoading(true);
    
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', event, currentSession ? 'Session exists' : 'No session');
      
      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        // Use setTimeout to avoid potential conflicts with Supabase client
        setTimeout(async () => {
          try {
            const fetchedProfile = await fetchProfile(currentSession.user.id);
            
            if (fetchedProfile) {
              setProfile(fetchedProfile);
              console.log('Profile fetch successful, user authenticated');
            } else {
              console.log('Failed to fetch profile, but user is authenticated');
              // Still allow user to continue, just without profile data
            }
          } catch (err) {
            console.error('Error in profile fetch:', err);
          } finally {
            setLoading(false);
          }
        }, 0);
      } else {
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
          setLoading(false);
          return;
        }
        
        if (!existingSession) {
          console.log('No existing session found');
          setLoading(false);
          
          // If on protected route, redirect to auth
          if (window.location.pathname !== '/auth') {
            navigate('/auth');
          }
          return;
        }
        
        // We have a session, update state
        setSession(existingSession);
        setUser(existingSession.user);
        
        // Try to fetch profile
        if (existingSession.user) {
          const fetchedProfile = await fetchProfile(existingSession.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          }
          
          // If on auth page, redirect to main
          if (window.location.pathname === '/auth') {
            navigate('/');
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in session init:', err);
        setLoading(false);
      }
    };
    
    initSession();
    setAuthInitialized(true);
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, authInitialized]);

  // Sign in with email and password - simple implementation
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
        
        // Try to fetch profile
        if (data.session.user) {
          const fetchedProfile = await fetchProfile(data.session.user.id);
          if (fetchedProfile) {
            setProfile(fetchedProfile);
          }
        }
        
        toast.success("Successfully signed in!");
        navigate('/');
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

  // Clean sign out implementation
  const signOut = async () => {
    try {
      setLoading(true);
      
      await supabase.auth.signOut();
      
      // Clear state
      setSession(null);
      setUser(null);
      setProfile(null);
      
      toast.success("You have been signed out");
      
      // Redirect to auth page
      navigate('/auth');
    } catch (err) {
      console.error('Error signing out:', err);
      toast.error("Sign out failed", {
        description: "Please try again or refresh the page."
      });
    } finally {
      setLoading(false);
    }
  };

  // Create auth context value
  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated
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
