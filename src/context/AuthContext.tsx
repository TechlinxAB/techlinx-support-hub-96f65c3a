
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Define user profile type
export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: 'consultant' | 'user';
  companyId: string | null;
  preferredLanguage: string;
  avatar?: string | null;
};

// Define auth context type with only essential properties
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
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
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
        return;
      }
      
      if (data) {
        const mappedProfile = mapDbProfileToUserProfile(data);
        setProfile(mappedProfile);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('Setting up auth subscription');
    setLoading(true);
    
    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', event, currentSession ? 'Has session' : 'No session');
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(() => {
          fetchProfile(currentSession.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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
