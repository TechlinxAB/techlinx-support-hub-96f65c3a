
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

// Debounce function to prevent multiple calls
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const authStateChangeCount = useRef(0);
  const mountedRef = useRef(true);
  
  // Debounced profile fetching to prevent multiple calls
  const fetchUserProfile = async (userId: string) => {
    if (!mountedRef.current) return;
    
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error.message);
        return;
      }

      if (data && mountedRef.current) {
        console.log("Profile data retrieved:", data);
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    }
  };
  
  // Debounce auth state changes to avoid multiple rapid updates
  const handleAuthChange = debounce((currentSession: Session | null) => {
    if (!mountedRef.current) return;
    
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    
    // For profile fetching, use setTimeout to prevent deadlocks
    if (currentSession?.user) {
      setTimeout(() => {
        if (mountedRef.current) {
          fetchUserProfile(currentSession.user.id);
        }
      }, 0);
    } else {
      // Clear the profile when no user
      setProfile(null);
    }
  }, 300);

  useEffect(() => {
    mountedRef.current = true;
    let authSubscription: { unsubscribe: () => void } | undefined;
    
    const initAuth = async () => {
      try {
        // 1. Set up the auth state listener first
        authSubscription = supabase.auth.onAuthStateChange((event, currentSession) => {
          authStateChangeCount.current += 1;
          console.log(`Auth state change #${authStateChangeCount.current}:`, event, currentSession?.user?.id);
          
          if (event === 'SIGNED_OUT') {
            // Clear state immediately for sign out
            if (mountedRef.current) {
              setSession(null);
              setUser(null);
              setProfile(null);
            }
          } else {
            // Debounce other auth state changes
            handleAuthChange(currentSession);
          }
        }).data.subscription;

        // 2. Then check for existing session
        const { data } = await supabase.auth.getSession();
        console.log("Got existing session:", data.session?.user?.id);
        
        if (!mountedRef.current) return;

        // Don't use debounce for initial session setup
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchUserProfile(data.session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mountedRef.current = false;
      if (authSubscription) {
        console.log("Cleaning up auth subscription");
        authSubscription.unsubscribe();
      }
      clearTimeout(handleAuthChange as unknown as number);
    };
  }, []);

  const signOut = async () => {
    try {
      // 1. Clear local state first to prevent race conditions
      setProfile(null);
      setUser(null);
      setSession(null);
      
      // 2. Then perform the signout operation
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
      });

      // Force clear local storage session data as a backup
      localStorage.removeItem('supabase.auth.token');
      
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
