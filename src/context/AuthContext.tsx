
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
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
  
  // Initialize auth state once on component mount
  useEffect(() => {
    console.log("Initializing authentication");
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`Auth event: ${event}`);
        
        if (session && session.user) {
          // We have a session, user is authenticated
          setUser(session.user);
          setStatus('AUTHENTICATED');
          
          // Fetch user profile data
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
              
            if (!error && data && mounted) {
              setProfile(data);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear auth state on sign out
          setUser(null);
          setProfile(null);
          setStatus('UNAUTHENTICATED');
        }
      }
    );
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          // No valid session
          if (mounted) {
            setStatus('UNAUTHENTICATED');
          }
          return;
        }
        
        // We have a valid session
        if (mounted) {
          setUser(data.session.user);
          setStatus('AUTHENTICATED');
          
          // Fetch user profile
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .maybeSingle();
              
            if (!profileError && profileData && mounted) {
              setProfile(profileData);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (mounted) {
          setStatus('UNAUTHENTICATED');
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
  
  // Simple sign out function
  const signOut = async () => {
    try {
      setStatus('LOADING'); // Update UI state immediately
      
      // First clear local storage to prevent auto-relogin 
      clearAuthData();
      
      // Then try server-side signout
      await supabase.auth.signOut();
      
      // Force UI state update regardless of server response
      setUser(null);
      setProfile(null);
      setStatus('UNAUTHENTICATED');
      
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      
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
