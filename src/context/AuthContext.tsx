
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

// Static auth state tracker - kept outside of component to prevent re-renders
const AUTH_STATE = {
  initialized: false,
  initializing: false,
  lastAuthAction: 0,
  debounceTime: 5000, // Much longer debounce to prevent any rapid auth state changes
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
  const profileFetchAttempt = useRef<Record<string, boolean>>({});
  
  // Fetch user profile - now simplified
  const fetchUserProfile = async (userId: string) => {
    if (profileFetchAttempt.current[userId]) return;
    profileFetchAttempt.current[userId] = true;
    
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
  
  // Set user info with proper debouncing
  const updateAuthState = (newSession: Session | null) => {
    if (!isMounted.current) return;
    
    const now = Date.now();
    if (now - AUTH_STATE.lastAuthAction < AUTH_STATE.debounceTime) {
      return; // Skip if too soon after last update
    }
    
    AUTH_STATE.lastAuthAction = now;
    
    if (newSession?.user) {
      console.log("Setting authenticated user state:", newSession.user.id);
      setSession(newSession);
      setUser(newSession.user);
      
      // Fetch profile with a slight delay to avoid auth deadlocks
      setTimeout(() => {
        if (isMounted.current && newSession.user) {
          fetchUserProfile(newSession.user.id);
        }
      }, 100);
    } else {
      console.log("Clearing user state - no session");
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };
  
  // Initialize authentication once only
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    const initAuth = async () => {
      // Prevent multiple initializations
      if (AUTH_STATE.initializing || AUTH_STATE.initialized) {
        return;
      }
      
      AUTH_STATE.initializing = true;
      console.log("Initializing auth state");
      
      try {
        // First set up the auth change listener
        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!isMounted.current) return;
          
          console.log(`Auth state changed: ${event} for user ${newSession?.user?.id || 'null'}`);
          
          if (event === 'SIGNED_OUT') {
            // Handle sign out
            setSession(null);
            setUser(null);
            setProfile(null);
            profileFetchAttempt.current = {};
            return;
          }
          
          // For other events, update session state with debouncing
          updateAuthState(newSession);
        });
        
        // Store unsubscribe function
        authListenerUnsubscribe.current = authListener.subscription.unsubscribe;
        
        // Check for existing session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session:", error.message);
          setSession(null);
          setUser(null);
        } else if (data?.session) {
          console.log("Found existing session for user:", data.session.user.id);
          updateAuthState(data.session);
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
          AUTH_STATE.initializing = false;
          AUTH_STATE.initialized = true;
        }
      }
    };
    
    initAuth();
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      
      if (authListenerUnsubscribe.current) {
        console.log("Cleaning up auth subscription");
        authListenerUnsubscribe.current();
        authListenerUnsubscribe.current = null;
      }
    };
  }, []);
  
  // Improved sign out function
  const signOut = async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Prevent rapid signout requests
      const now = Date.now();
      if (now - AUTH_STATE.lastAuthAction < AUTH_STATE.debounceTime) {
        return;
      }
      AUTH_STATE.lastAuthAction = now;
      
      // Clear profile fetch tracking
      profileFetchAttempt.current = {};
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Supabase signOut error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      // Clear local state
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
