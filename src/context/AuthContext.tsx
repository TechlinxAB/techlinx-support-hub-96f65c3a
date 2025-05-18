
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simple auth states
type AuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthContextType {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Core auth state
  const [status, setStatus] = useState<AuthStatus>('LOADING');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Track component mounting to prevent state updates after unmount
  const isMounted = React.useRef<boolean>(true);

  // Fetch user profile when we have a user ID
  const fetchUserProfile = async (userId: string) => {
    if (!isMounted.current) return;

    try {
      console.log("Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error.message);
        return;
      }
      
      if (data && isMounted.current) {
        console.log("Profile data retrieved successfully");
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    }
  };
  
  // Initialize auth state
  useEffect(() => {
    isMounted.current = true;
    
    // First set up the auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;
      
      console.log(`Auth state changed: ${event} for user ${newSession?.user?.id || 'null'}`);
      
      // Handle sign out event
      if (event === 'SIGNED_OUT') {
        setStatus('UNAUTHENTICATED');
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }
      
      // Handle sign in events
      if (newSession?.user) {
        setStatus('AUTHENTICATED');
        setSession(newSession);
        setUser(newSession.user);
        
        // Fetch profile with slight delay to avoid race conditions
        setTimeout(() => {
          if (isMounted.current && newSession.user) {
            fetchUserProfile(newSession.user.id);
          }
        }, 100);
      }
    });
    
    // Check for existing session AFTER setting up the listener
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error.message);
          setStatus('UNAUTHENTICATED');
          setLoading(false);
          return;
        }
        
        if (data.session) {
          console.log("Found existing session for user:", data.session.user.id);
          setStatus('AUTHENTICATED');
          setSession(data.session);
          setUser(data.session.user);
          fetchUserProfile(data.session.user.id);
        } else {
          console.log("No existing session");
          setStatus('UNAUTHENTICATED');
        }
      } catch (error) {
        console.error("Session check error:", error);
        setStatus('UNAUTHENTICATED');
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    checkSession();
    
    // Cleanup
    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // Sign out function
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Clear local state first for faster UI feedback
      setStatus('LOADING');
      
      // Clear localStorage cache
      clearAuthData();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      // The auth listener will handle updating the state
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast.error("Error signing out");
    }
  };
  
  // Context value
  const value: AuthContextType = {
    status,
    session,
    user,
    profile,
    loading,
    signOut,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to import from client.ts
const clearAuthData = (): void => {
  try {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
