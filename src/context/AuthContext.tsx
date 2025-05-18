
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, clearAuthData } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simple auth states
type AuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  profile: any | null;
  signOut: () => Promise<void>;
  debug: {
    lastEvent: string | null;
    lastEventTime: Date | null;
    sessionCheck: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Core auth state
  const [status, setStatus] = useState<AuthStatus>('LOADING');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [sessionCheck, setSessionCheck] = useState<boolean>(false);
  
  // Use ref to track initialization state
  const isInitialized = useRef(false);
  
  // Initialize auth state once on component mount
  useEffect(() => {
    console.log("Initializing authentication");
    let mounted = true;
    
    // Debounce status changes to prevent fast oscillation
    const updateStatus = (newStatus: AuthStatus, newUser: User | null) => {
      if (!mounted) return;
      
      console.log(`Auth status update: ${newStatus}`);
      setStatus(newStatus);
      setUser(newUser);
      
      // Only fetch profile data if we have an authenticated user
      if (newStatus === 'AUTHENTICATED' && newUser) {
        // Add delay to prevent contention with auth state change
        setTimeout(() => {
          if (!mounted) return;
          fetchUserProfile(newUser.id);
        }, 0);
      } else if (newStatus === 'UNAUTHENTICATED') {
        setProfile(null);
      }
    };
    
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
          
        if (!mounted) return;
        
        if (!error && data) {
          setProfile(data);
        } else {
          console.log("Could not fetch profile:", error);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    // Set up auth state listener - this needs to happen BEFORE session check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log(`Auth event: ${event}`);
        setLastEvent(event);
        setLastEventTime(new Date());
        
        if (session && session.user) {
          // We have a session, user is authenticated
          updateStatus('AUTHENTICATED', session.user);
        } else if (event === 'SIGNED_OUT') {
          // Clear auth state on sign out
          updateStatus('UNAUTHENTICATED', null);
        } else if (event === 'USER_DELETED') {
          // Handle user deletion
          updateStatus('UNAUTHENTICATED', null);
        }
      }
    );
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        setSessionCheck(true);
        
        if (!mounted) return;
        
        if (error) {
          console.error("Session check error:", error);
          updateStatus('UNAUTHENTICATED', null);
          return;
        }
        
        if (!data.session) {
          console.log("No active session found");
          updateStatus('UNAUTHENTICATED', null);
          return;
        }
        
        // Valid session exists
        console.log("Valid session found");
        updateStatus('AUTHENTICATED', data.session.user);
        
      } catch (error) {
        console.error("Session check exception:", error);
        if (mounted) {
          updateStatus('UNAUTHENTICATED', null);
        }
      } finally {
        if (mounted) {
          isInitialized.current = true;
        }
      }
    };
    
    // Start session check
    checkSession();
    
    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  
  // Enhanced sign out function with multiple fallbacks
  const signOut = async () => {
    try {
      console.log("Signing out: started");
      setStatus('LOADING'); // Update UI state immediately
      
      // First clear local storage to prevent auto-relogin 
      clearAuthData();
      console.log("Signing out: cleared local storage");
      
      // Then try server-side signout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out API error:", error);
        // Continue anyway - we want to sign out locally regardless
      } else {
        console.log("Signing out: server-side sign out successful");
      }
      
      // Force UI state update regardless of server response
      setUser(null);
      setProfile(null);
      setStatus('UNAUTHENTICATED');
      
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out exception:", error);
      
      // Still update UI state even if server request fails
      setUser(null);
      setProfile(null);
      setStatus('UNAUTHENTICATED');
      
      toast.error("Error during sign out, but you've been signed out locally");
    }
  };
  
  const value: AuthContextType = {
    status,
    user,
    profile,
    signOut,
    debug: {
      lastEvent,
      lastEventTime,
      sessionCheck
    }
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
