
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, clearAuthData } from '@/integrations/supabase/client';
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
  
  // Function to safely clear auth state in the context
  const clearAuthState = () => {
    if (!isMounted.current) return;
    
    setStatus('UNAUTHENTICATED');
    setSession(null);
    setUser(null);
    setProfile(null);
  };
  
  // Initialize auth state
  useEffect(() => {
    console.log("Initializing auth state");
    isMounted.current = true;
    
    // Set up auth change listener FIRST to catch all events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;
      
      console.log(`Auth state changed: ${event} for user ${newSession?.user?.id || 'null'}`);
      
      // Handle auth events
      switch (event) {
        case 'SIGNED_IN':
          if (newSession) {
            setStatus('AUTHENTICATED');
            setSession(newSession);
            setUser(newSession.user);
            
            // Fetch profile after a slight delay to avoid race conditions
            setTimeout(() => {
              if (isMounted.current && newSession.user) {
                fetchUserProfile(newSession.user.id);
              }
            }, 100);
          }
          break;
          
        case 'SIGNED_OUT':
          clearAuthState();
          break;
        
        case 'TOKEN_REFRESHED':
          if (newSession) {
            setSession(newSession);
          }
          break;
        
        case 'USER_UPDATED':
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
          }
          break;
      }
    });
    
    // THEN check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error.message);
          clearAuthState();
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
          clearAuthState();
        }
      } catch (error) {
        console.error("Session check error:", error);
        clearAuthState();
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    // Call checkSession after setting up listener
    checkSession();
    
    // Cleanup
    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // Enhanced sign out function with multiple fallbacks
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Update local state immediately for UI feedback
      setStatus('LOADING');
      
      // First clear local storage to prevent auto-relogin after redirect
      await clearAuthData();
      
      // Try local signout first (safer than global)
      try {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          console.warn("Local signout error:", localError);
          // Continue with fallbacks even if this fails
        }
      } catch (localErr) {
        console.warn("Local signout exception:", localErr);
        // Continue with fallbacks
      }
      
      // Force clear auth state
      clearAuthState();
      
      // If we reach here, consider it successful from the user's perspective
      toast.success("Signed out successfully");
      return;
      
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast.error("Error signing out");
      
      // Force auth state reset even on error
      clearAuthState();
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
