
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, hasValidSession } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global auth state to prevent loops and conflicts
const AUTH_STATE = {
  INITIALIZED: false,
  LAST_USER_ID: null as string | null,
  LAST_AUTH_ACTION: 0, // Timestamp of last auth action
  SESSION_CHECKED: false, // Flag to track if session has been checked
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs to manage subscriptions and prevent memory leaks
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const profileFetchTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  
  // Clean up function to prevent memory leaks and remove active timeouts
  const cleanupResources = () => {
    // Clear all profile fetch timeouts
    profileFetchTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    profileFetchTimeoutsRef.current = [];
    
    // Unsubscribe from auth changes
    if (authSubscriptionRef.current) {
      console.log("Cleaning up auth subscription");
      authSubscriptionRef.current.unsubscribe();
      authSubscriptionRef.current = null;
    }
  };
  
  // Fetch profile function with better error handling
  const fetchUserProfile = async (userId: string) => {
    if (!mountedRef.current) return null;
    
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error.message);
        return null;
      }

      if (data && mountedRef.current) {
        console.log("Profile data retrieved successfully");
        setProfile(data);
        return data;
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      return null;
    }
  };

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupResources();
    };
  }, []);

  // Main auth initialization effect
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("Initializing auth state");
        setLoading(true);
        
        // First set up the subscription to avoid missing events
        if (!authSubscriptionRef.current && mountedRef.current) {
          const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (!mountedRef.current) return;
            
            console.log(`Auth state changed: ${event} for user ${currentSession?.user?.id || 'null'}`);
            
            // Handle sign out event
            if (event === 'SIGNED_OUT') {
              console.log("User signed out, clearing state");
              setSession(null);
              setUser(null);
              setProfile(null);
              AUTH_STATE.LAST_USER_ID = null;
              return;
            }
            
            // For sign in and token refresh, update state
            if (currentSession?.user) {
              // Only update if user ID has changed to prevent loops
              const newUserId = currentSession.user.id;
              if (AUTH_STATE.LAST_USER_ID !== newUserId) {
                console.log(`Setting new user: ${newUserId}`);
                setSession(currentSession);
                setUser(currentSession.user);
                AUTH_STATE.LAST_USER_ID = newUserId;
                
                // Use setTimeout to avoid potential auth deadlocks
                const timeoutId = setTimeout(() => {
                  if (mountedRef.current) {
                    fetchUserProfile(newUserId);
                  }
                }, 100);
                profileFetchTimeoutsRef.current.push(timeoutId);
              }
            }
          });
          
          authSubscriptionRef.current = data.subscription;
        }
        
        // Now check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError.message);
          setSession(null);
          setUser(null);
          setLoading(false);
          AUTH_STATE.SESSION_CHECKED = true;
          return;
        }
        
        const initialSession = sessionData?.session;
        
        if (initialSession?.user) {
          console.log("Found existing session for user:", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Mark global state as initialized
          AUTH_STATE.INITIALIZED = true;
          AUTH_STATE.LAST_USER_ID = initialSession.user.id;
          
          // Fetch profile with a small delay to avoid potential deadlocks
          const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
              fetchUserProfile(initialSession.user.id);
            }
          }, 100);
          profileFetchTimeoutsRef.current.push(timeoutId);
        } else {
          console.log("No existing session found");
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error: any) {
        console.error("Error initializing auth:", error.message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          AUTH_STATE.SESSION_CHECKED = true;
        }
      }
    };

    // Run init only if not already initialized to prevent double execution
    if (!AUTH_STATE.SESSION_CHECKED) {
      initAuth();
    }
  }, []);

  // Improved signOut function that properly handles the auth flow
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      AUTH_STATE.LAST_AUTH_ACTION = Date.now();
      
      // First clear local state to prevent flashing UI
      setSession(null);
      setUser(null);
      setProfile(null);
      AUTH_STATE.LAST_USER_ID = null;
      
      // Call Supabase signOut AFTER clearing local state
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      // Clear localStorage items for a clean slate
      if (typeof window !== 'undefined') {
        // Clear any custom auth items if needed, but let Supabase handle its own items
        // localStorage.removeItem('custom-auth-item');
      }
      
      toast.success("Signed out successfully");
      
    } catch (error: any) {
      console.error('Error in signOut function:', error.message);
      toast.error("Error signing out: " + (error.message || "An unknown error occurred"));
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
