
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Core auth state
  const [status, setStatus] = useState<AuthStatus>('LOADING');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  
  // Use refs to prevent race conditions
  const isInitialized = useRef(false);
  const authListenerRef = useRef<{ unsubscribe: () => void } | null>(null);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckedRef = useRef(false);
  
  // Debounced status updates to prevent rapid state changes
  const updateAuthStatus = (newStatus: AuthStatus, newUser: User | null) => {
    // Clear any pending timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    // Add a small delay to batch potential rapid changes
    authTimeoutRef.current = setTimeout(() => {
      console.log(`Auth status update: ${newStatus}`);
      
      setStatus(newStatus);
      setUser(newUser);
      
      // Only fetch profile if authenticated and we have a user
      if (newStatus === 'AUTHENTICATED' && newUser) {
        fetchUserProfile(newUser.id);
      } else if (newStatus === 'UNAUTHENTICATED') {
        setProfile(null);
      }
      
    }, 50); // Small delay to batch updates
  };
  
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (!error && data) {
        setProfile(data);
      } else {
        console.log("Could not fetch profile:", error);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  
  // Initialize auth state once on component mount
  useEffect(() => {
    if (isInitialized.current) return;
    
    console.log("Initializing authentication");
    let mounted = true;
    isInitialized.current = true;
    
    const setupAuthListener = () => {
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
      
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        
        console.log(`Auth event: ${event}`);
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          updateAuthStatus('AUTHENTICATED', session.user);
        } else if (event === 'SIGNED_OUT') {
          updateAuthStatus('UNAUTHENTICATED', null);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log("Valid session found");
            updateAuthStatus('AUTHENTICATED', session.user);
          } else {
            console.log("No active session found");
            updateAuthStatus('UNAUTHENTICATED', null);
          }
          sessionCheckedRef.current = true;
        }
      });
      
      authListenerRef.current = data.subscription;
      return data.subscription;
    };
    
    // Set up auth listener
    setupAuthListener();
    
    // Check for existing session if not already checked
    if (!sessionCheckedRef.current) {
      supabase.auth.getSession().then(({ data, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error("Session check error:", error);
          updateAuthStatus('UNAUTHENTICATED', null);
          return;
        }
        
        if (data.session) {
          console.log("Valid session found");
          updateAuthStatus('AUTHENTICATED', data.session.user);
        } else {
          console.log("No active session found");
          updateAuthStatus('UNAUTHENTICATED', null);
        }
        
        sessionCheckedRef.current = true;
      });
    }
    
    // Cleanup function
    return () => {
      mounted = false;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
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
