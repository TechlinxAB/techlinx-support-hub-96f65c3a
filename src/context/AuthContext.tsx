
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple state management to prevent auth loops
const AUTH_STATE = {
  INITIALIZED: false,
  LAST_USER_ID: null as string | null,
  REDIRECTING: false,
  REDIRECT_TIMESTAMP: 0,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const profileFetchAttempts = useRef<{[key: string]: number}>({});
  
  // Debounced profile fetching with retry limits
  const fetchUserProfile = async (userId: string) => {
    if (!mountedRef.current) return null;
    
    // Track fetch attempts to prevent infinite loops
    if (!profileFetchAttempts.current[userId]) {
      profileFetchAttempts.current[userId] = 0;
    }
    
    // Limit fetch attempts per user
    if (profileFetchAttempts.current[userId] >= 3) {
      console.error(`Too many profile fetch attempts for user: ${userId}`);
      return null;
    }
    
    profileFetchAttempts.current[userId]++;
    
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error.message);
        return null;
      }

      if (data && mountedRef.current) {
        console.log("Profile data retrieved:", data);
        setProfile(data);
        return data;
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      return null;
    }
  };

  // Clear auth state on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Cleanup subscription if it exists
      if (authSubscriptionRef.current) {
        console.log("Cleaning up auth subscription");
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
    };
  }, []);

  // Main auth effect - separated from profile fetching for better stability
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("Initializing auth state");
        
        // Get existing session first - this is synchronous from local storage
        const { data: sessionData } = await supabase.auth.getSession();
        const initialSession = sessionData?.session;
        
        // Update state with existing session if any
        if (initialSession?.user) {
          if (mountedRef.current) {
            console.log("Found existing session for user:", initialSession.user.id);
            setSession(initialSession);
            setUser(initialSession.user);
            
            // Mark our global state as initialized with this user
            AUTH_STATE.INITIALIZED = true;
            AUTH_STATE.LAST_USER_ID = initialSession.user.id;
            
            // Fetch profile separate from auth state changes
            fetchUserProfile(initialSession.user.id);
          }
        } else {
          if (mountedRef.current) {
            console.log("No existing session found");
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
        
        // Then set up the subscription for future changes
        if (!authSubscriptionRef.current && mountedRef.current) {
          const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (!mountedRef.current) return;
            
            console.log(`Auth state changed: ${event} ${currentSession?.user?.id}`);
            
            // Handle sign out event immediately
            if (event === 'SIGNED_OUT') {
              console.log("User signed out, clearing state");
              setSession(null);
              setUser(null);
              setProfile(null);
              AUTH_STATE.LAST_USER_ID = null;
              return;
            }
            
            // For sign in, update state and fetch profile
            if (currentSession?.user) {
              // Only update if the user ID has changed to prevent loops
              if (AUTH_STATE.LAST_USER_ID !== currentSession.user.id) {
                console.log(`Setting new user: ${currentSession.user.id}`);
                setSession(currentSession);
                setUser(currentSession.user);
                AUTH_STATE.LAST_USER_ID = currentSession.user.id;
                
                // Use setTimeout to break potential deadlocks
                setTimeout(() => {
                  if (mountedRef.current) {
                    fetchUserProfile(currentSession.user!.id);
                  }
                }, 50);
              }
            }
          });
          
          authSubscriptionRef.current = data.subscription;
        }
        
      } catch (error: any) {
        console.error("Error initializing auth:", error.message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const signOut = async () => {
    try {
      console.log("Signing out user");
      
      // Clear local state first for immediate UI update
      setProfile(null);
      
      // Add forced removal of localStorage supabase items to ensure clean state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
      }
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Final clear of state - belt and suspenders
      setUser(null);
      setSession(null);
      AUTH_STATE.LAST_USER_ID = null;
      
      toast({
        title: "Signed out successfully",
      });
      
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
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
