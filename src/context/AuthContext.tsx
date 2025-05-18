
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
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

// Create the context with default undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth state constants to prevent rapid state changes
const AUTH_CONFIG = {
  debounceTime: 2000,        // Time to wait between processing auth state changes
  profileCacheTime: 60000,   // Cache profile data for 1 minute
  maxRetryAttempts: 3,       // Max retries for profile fetch
  retryDelay: 1000,          // Time between retries
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Core state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Refs for tracking state across renders
  const isMounted = useRef<boolean>(true);
  const authInitialized = useRef<boolean>(false);
  const lastAuthAction = useRef<number>(0);
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);
  const profileCache = useRef<Record<string, {data: any, timestamp: number}>>({});
  const profileFetchAttempts = useRef<Record<string, number>>({});
  
  // Profile fetching with caching and retry logic
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Skip if component unmounted
    if (!isMounted.current) return;
    
    // Check cache first
    const cache = profileCache.current[userId];
    if (cache && (Date.now() - cache.timestamp) < AUTH_CONFIG.profileCacheTime) {
      console.log("Using cached profile for user:", userId);
      setProfile(cache.data);
      return;
    }
    
    // Track fetch attempts
    const attempts = profileFetchAttempts.current[userId] || 0;
    if (attempts >= AUTH_CONFIG.maxRetryAttempts) {
      console.warn(`Max profile fetch attempts reached for user ${userId}`);
      return;
    }
    
    profileFetchAttempts.current[userId] = attempts + 1;
    
    try {
      console.log("Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error.message);
        
        // Retry with exponential backoff
        const retryDelay = AUTH_CONFIG.retryDelay * Math.pow(2, attempts);
        setTimeout(() => {
          if (isMounted.current) fetchUserProfile(userId);
        }, retryDelay);
        
        return;
      }
      
      if (data && isMounted.current) {
        console.log("Profile data retrieved successfully");
        setProfile(data);
        
        // Update cache
        profileCache.current[userId] = {
          data,
          timestamp: Date.now()
        };
        
        // Reset attempts counter on success
        profileFetchAttempts.current[userId] = 0;
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    }
  }, []);
  
  // Safe state updater with debouncing
  const updateAuthState = useCallback((newSession: Session | null) => {
    if (!isMounted.current) return;
    
    const now = Date.now();
    if (now - lastAuthAction.current < AUTH_CONFIG.debounceTime) {
      console.log("Debouncing auth state update");
      return;
    }
    lastAuthAction.current = now;
    
    if (newSession?.user) {
      console.log("Setting authenticated user state:", newSession.user.id);
      setSession(newSession);
      setUser(newSession.user);
      
      // Fetch profile with slight delay to avoid auth deadlocks
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
  }, [fetchUserProfile]);
  
  // Initialize auth once - critical for preventing loops
  useEffect(() => {
    isMounted.current = true;
    
    const initializeAuth = async () => {
      // Only initialize once
      if (authInitialized.current) {
        console.log("Auth already initialized, skipping");
        return;
      }
      
      console.log("Initializing auth state");
      authInitialized.current = true;
      
      try {
        // First set up auth listener to catch any changes
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!isMounted.current) return;
          
          console.log(`Auth state changed: ${event} for user ${newSession?.user?.id || 'null'}`);
          
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            profileCache.current = {};
            profileFetchAttempts.current = {};
            return;
          }
          
          // For other events, update session state with debouncing
          updateAuthState(newSession);
        });
        
        // Store subscription for cleanup
        authSubscription.current = listener.subscription;
        
        // Now check for existing session AFTER setting up listener
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
        // Always finish loading state once auth is initialized
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    // Start auth initialization
    initializeAuth();
    
    // Cleanup
    return () => {
      isMounted.current = false;
      
      // Unsubscribe from auth changes
      if (authSubscription.current) {
        console.log("Cleaning up auth subscription");
        authSubscription.current.unsubscribe();
        authSubscription.current = null;
      }
    };
  }, [updateAuthState]);
  
  // Sign out function with improved error handling
  const signOut = useCallback(async () => {
    try {
      console.log("Attempting to sign out user");
      
      // Prevent rapid signout requests
      const now = Date.now();
      if (now - lastAuthAction.current < AUTH_CONFIG.debounceTime) {
        console.log("Debouncing sign out request");
        return;
      }
      lastAuthAction.current = now;
      
      // Clear local state first for faster UI feedback
      setSession(null);
      setUser(null);
      setProfile(null);
      profileCache.current = {};
      profileFetchAttempts.current = {};
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error.message);
        toast.error("Error signing out: " + error.message);
        return;
      }
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error('Error in signOut function:', error.message);
      toast.error("Error signing out: " + (error.message || "Unknown error"));
    }
  }, []);
  
  // Context value
  const value: AuthContextType = {
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
