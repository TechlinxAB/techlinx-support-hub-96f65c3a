
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

// Global auth state tracker
const AUTH_STATE = {
  IS_INITIALIZING: false,
  IS_INITIALIZED: false,
  LAST_AUTH_ACTION: 0,
  DEBOUNCE_TIME: 2000, // Increased debounce time to prevent rapid actions
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Main state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs for cleanup and state tracking
  const isMounted = useRef(true);
  const authListenerUnsubscribe = useRef<(() => void) | null>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const profileFetchAttempted = useRef<Record<string, boolean>>({});
  
  // Clean up function to prevent memory leaks and cancel pending operations
  const cleanupResources = () => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
    
    // Unsubscribe from auth listener
    if (authListenerUnsubscribe.current) {
      console.log("Cleaning up auth subscription");
      authListenerUnsubscribe.current();
      authListenerUnsubscribe.current = null;
    }
  };
  
  // Fetch user profile with improved tracking to prevent duplicate requests
  const fetchUserProfile = async (userId: string): Promise<void> => {
    if (!isMounted.current || profileFetchAttempted.current[userId]) return;
    
    // Mark this user ID as having a fetch attempt
    profileFetchAttempted.current[userId] = true;
    
    try {
      console.log("Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user profile:", error.message);
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
  
  // Set user info with debouncing to prevent rapid state changes
  const setUserInfo = (newSession: Session | null) => {
    const now = Date.now();
    if (now - AUTH_STATE.LAST_AUTH_ACTION < AUTH_STATE.DEBOUNCE_TIME) {
      // Skip if too soon after last update
      return;
    }
    
    AUTH_STATE.LAST_AUTH_ACTION = now;
    
    if (newSession?.user) {
      console.log("Setting new user:", newSession.user.id);
      setSession(newSession);
      setUser(newSession.user);
      
      // Fetch profile with a slight delay to avoid auth deadlocks
      const timeoutId = setTimeout(() => {
        if (isMounted.current) {
          fetchUserProfile(newSession.user.id);
        }
      }, 100);
      
      timeoutRefs.current.push(timeoutId);
    } else {
      // Clear user data if no session
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };
  
  // Initialize authentication one time only
  useEffect(() => {
    // Set mounted flag for cleanup
    isMounted.current = true;
    
    const initAuth = async () => {
      // Prevent multiple initializations
      if (AUTH_STATE.IS_INITIALIZING || AUTH_STATE.IS_INITIALIZED) {
        return;
      }
      
      AUTH_STATE.IS_INITIALIZING = true;
      console.log("Initializing auth state");
      
      try {
        // First set up the auth change listener to catch future changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!isMounted.current) return;
          
          console.log(`Auth state changed: ${event} for user ${newSession?.user?.id || 'null'}`);
          
          if (event === 'SIGNED_OUT') {
            // Handle sign out - clear state immediately
            setSession(null);
            setUser(null);
            setProfile(null);
            profileFetchAttempted.current = {};
            return;
          }
          
          // For all other events, update session state
          setUserInfo(newSession);
        });
        
        // Store unsubscribe function for cleanup
        authListenerUnsubscribe.current = authListener.subscription.unsubscribe;
        
        // After setting up the listener, check for an existing session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session:", error.message);
          console.log("No valid session found during initial check");
          setSession(null);
          setUser(null);
          
        } else if (data?.session) {
          console.log("Found existing session for user:", data.session.user.id);
          setUserInfo(data.session);
          
        } else {
          console.log("No existing session found");
          setSession(null);
          setUser(null);
        }
      } catch (error: any) {
        console.error("Error in auth initialization:", error.message);
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          AUTH_STATE.IS_INITIALIZING = false;
          AUTH_STATE.IS_INITIALIZED = true;
        }
      }
    };
    
    // Run initialization if not already done
    if (!AUTH_STATE.IS_INITIALIZED) {
      initAuth();
    } else {
      setLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      cleanupResources();
    };
  }, []);
  
  // Improved sign out function with proper error handling
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Prevent rapid signout requests
      const now = Date.now();
      if (now - AUTH_STATE.LAST_AUTH_ACTION < AUTH_STATE.DEBOUNCE_TIME) {
        return;
      }
      AUTH_STATE.LAST_AUTH_ACTION = now;
      
      // Clear profile fetch tracking
      profileFetchAttempted.current = {};
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      // Clear local state after successful signout
      // (The onAuthStateChange will also trigger this but we do it here for immediate effect)
      setSession(null);
      setUser(null);
      setProfile(null);
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Error in signOut function:', error.message);
      toast.error("Error signing out: " + (error.message || "Unknown error"));
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
