
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the shape of our auth context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Create the context with undefined as default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global auth state to track initialization state
const AUTH_STATE = {
  INITIALIZED: false,
  SESSION_CHECKED: false,
  LAST_AUTH_ACTION: 0,
  DEBOUNCE_TIME: 500, // ms to debounce auth actions
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Main state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs to properly handle cleanup
  const isMounted = useRef(true);
  const authListenerUnsubscribe = useRef<(() => void) | null>(null);
  const profileTimeouts = useRef<NodeJS.Timeout[]>([]);
  
  // Clean up function to prevent memory leaks
  const cleanupResources = () => {
    // Clear all timeouts
    profileTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    profileTimeouts.current = [];
    
    // Unsubscribe from auth listener
    if (authListenerUnsubscribe.current) {
      console.log("Cleaning up auth subscription");
      authListenerUnsubscribe.current();
      authListenerUnsubscribe.current = null;
    }
  };
  
  // Fetch user profile with better error handling
  const fetchUserProfile = async (userId: string): Promise<any | null> => {
    if (!isMounted.current) return null;
    
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
      
      if (data && isMounted.current) {
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
  
  // Initialize authentication
  useEffect(() => {
    // Set mounted ref for cleanup
    isMounted.current = true;
    
    const initAuth = async () => {
      if (AUTH_STATE.INITIALIZED) return;
      
      console.log("Initializing auth state");
      setLoading(true);
      
      try {
        // 1. First set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (!isMounted.current) return;
            
            console.log(`Auth state changed: ${event} for user ${currentSession?.user?.id || 'null'}`);
            
            // Handle signed out event
            if (event === 'SIGNED_OUT') {
              console.log("User signed out, clearing state");
              setSession(null);
              setUser(null);
              setProfile(null);
              return;
            }
            
            // For sign in and session events, update state
            if (currentSession?.user) {
              setSession(currentSession);
              setUser(currentSession.user);
              
              // Debounce profile fetching
              const now = Date.now();
              if (now - AUTH_STATE.LAST_AUTH_ACTION > AUTH_STATE.DEBOUNCE_TIME) {
                AUTH_STATE.LAST_AUTH_ACTION = now;
                
                // Use setTimeout to avoid potential auth deadlocks
                const timeoutId = setTimeout(() => {
                  if (isMounted.current) {
                    fetchUserProfile(currentSession.user.id);
                  }
                }, 100);
                
                profileTimeouts.current.push(timeoutId);
              }
            }
          }
        );
        
        authListenerUnsubscribe.current = authListener.subscription.unsubscribe;
        
        // 2. Then check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError.message);
          setSession(null);
          setUser(null);
          AUTH_STATE.SESSION_CHECKED = true;
          return;
        }
        
        const initialSession = sessionData?.session;
        
        if (initialSession?.user) {
          console.log("Found existing session for user:", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          AUTH_STATE.INITIALIZED = true;
          
          // Fetch profile after a small delay
          const timeoutId = setTimeout(() => {
            if (isMounted.current) {
              fetchUserProfile(initialSession.user.id);
            }
          }, 100);
          
          profileTimeouts.current.push(timeoutId);
        } else {
          console.log("No existing session found");
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error: any) {
        console.error("Error initializing auth:", error.message);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          AUTH_STATE.SESSION_CHECKED = true;
          AUTH_STATE.INITIALIZED = true;
        }
      }
    };
    
    // Only run init if not already checked
    if (!AUTH_STATE.SESSION_CHECKED) {
      initAuth();
    } else {
      setLoading(false);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      cleanupResources();
    };
  }, []);
  
  // Improved signOut function
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Prevent rapid signout requests
      const now = Date.now();
      if (now - AUTH_STATE.LAST_AUTH_ACTION < AUTH_STATE.DEBOUNCE_TIME) {
        return;
      }
      AUTH_STATE.LAST_AUTH_ACTION = now;
      
      // First clear local state
      setUser(null);
      setProfile(null);
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      // Clear session state after successful signout
      setSession(null);
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Error in signOut function:', error.message);
      toast.error("Error signing out: " + (error.message || "An unknown error occurred"));
    }
  };
  
  // Context value
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

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
