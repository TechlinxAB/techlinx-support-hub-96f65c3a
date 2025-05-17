
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Debounced profile fetching to prevent multiple calls
  const fetchUserProfile = async (userId: string) => {
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

      if (data) {
        console.log("Profile data retrieved:", data);
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void };
    
    const initAuth = async () => {
      try {
        // 1. Set up the auth state listener first
        authSubscription = supabase.auth.onAuthStateChange((event, currentSession) => {
          console.log("Auth state changed:", event, currentSession?.user?.id);
          
          if (!mounted) return;
          
          // Update session and user state synchronously
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // For profile fetching, use setTimeout to prevent deadlocks
          if (currentSession?.user) {
            setTimeout(() => {
              if (mounted) fetchUserProfile(currentSession.user.id);
            }, 0);
          } else if (event === 'SIGNED_OUT') {
            // Clear the profile when signing out
            setProfile(null);
          }
        }).data.subscription;

        // 2. Then check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Got existing session:", currentSession?.user?.id);
        
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      // 1. Clear local state first to prevent race conditions
      setProfile(null);
      
      // 2. Then perform the signout operation
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) throw error;
      
      // 3. Clear session and user state
      setSession(null);
      setUser(null);
      
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
