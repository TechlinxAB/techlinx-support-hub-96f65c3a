
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
  // Impersonation related fields
  impersonatedUser: any | null;
  impersonatedProfile: any | null;
  isImpersonating: boolean;
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<any | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalSession, setOriginalSession] = useState<Session | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [originalProfile, setOriginalProfile] = useState<any | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Fetch user profile data in a separate operation
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Got existing session:", currentSession?.user?.id);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    // Check for any active impersonation session in localStorage
    checkForActiveImpersonation();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        throw error;
      }

      if (data) {
        console.log("Profile data retrieved:", data);
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    }
  };

  const signOut = async () => {
    // If impersonating, end impersonation first
    if (isImpersonating) {
      await endImpersonation();
    }
    
    try {
      await supabase.auth.signOut();
      setProfile(null);
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Impersonation management functions
  const startImpersonation = async (userId: string) => {
    if (isImpersonating) {
      toast({
        title: "Already impersonating a user",
        description: "Please end the current impersonation session first.",
        variant: "destructive",
      });
      return;
    }

    if (!profile || profile.role !== 'consultant') {
      toast({
        title: "Permission denied",
        description: "Only consultants can impersonate users.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Store current session and user
      setOriginalSession(session);
      setOriginalUser(user);
      setOriginalProfile(profile);

      // Get the impersonated user's profile
      const { data: impersonatedUserData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Create an impersonation session record
      const { error: impersonationError } = await supabase
        .from('impersonation_sessions')
        .insert({
          original_user_id: user!.id,
          impersonated_user_id: userId,
          status: 'active',
        });

      if (impersonationError) throw impersonationError;

      // Save impersonation data to localStorage for persistence
      localStorage.setItem('impersonationActive', 'true');
      localStorage.setItem('impersonatedUserId', userId);
      localStorage.setItem('originalUserId', user!.id);

      // Set the active user to the impersonated one
      setImpersonatedUser({ id: userId });
      setImpersonatedProfile(impersonatedUserData);
      setIsImpersonating(true);

      // Switch the current user and profile
      setUser({ ...user!, id: userId } as User);
      setProfile(impersonatedUserData);

      toast({
        title: "Impersonation started",
        description: `You are now viewing as ${impersonatedUserData.name || impersonatedUserData.email}`,
      });
    } catch (error: any) {
      console.error('Error starting impersonation:', error);
      toast({
        title: "Error starting impersonation",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  const endImpersonation = async () => {
    if (!isImpersonating) return;

    try {
      // Update the impersonation session to 'ended'
      if (originalUser) {
        const { error: updateError } = await supabase
          .from('impersonation_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .match({
            original_user_id: originalUser.id,
            impersonated_user_id: user?.id,
            status: 'active',
          });

        if (updateError) throw updateError;
      }

      // Restore original session
      setUser(originalUser);
      setProfile(originalProfile);
      setIsImpersonating(false);
      setImpersonatedUser(null);
      setImpersonatedProfile(null);

      // Clear impersonation data from localStorage
      localStorage.removeItem('impersonationActive');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('originalUserId');

      toast({
        title: "Impersonation ended",
        description: "You've returned to your account",
      });
    } catch (error: any) {
      console.error('Error ending impersonation:', error);
      toast({
        title: "Error ending impersonation",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  // Check for active impersonation sessions stored in localStorage
  const checkForActiveImpersonation = async () => {
    const impersonationActive = localStorage.getItem('impersonationActive');
    const impersonatedUserId = localStorage.getItem('impersonatedUserId');
    const originalUserId = localStorage.getItem('originalUserId');

    if (impersonationActive === 'true' && impersonatedUserId && originalUserId) {
      try {
        // First, get original user profile
        const { data: originalUserData, error: originalError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', originalUserId)
          .single();

        if (originalError) throw originalError;

        // Then get impersonated user profile
        const { data: impersonatedUserData, error: impersonatedError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', impersonatedUserId)
          .single();

        if (impersonatedError) throw impersonatedError;

        // Restore the impersonation state
        setOriginalUser({ id: originalUserId } as User);
        setOriginalProfile(originalUserData);
        setImpersonatedUser({ id: impersonatedUserId } as User);
        setImpersonatedProfile(impersonatedUserData);
        setIsImpersonating(true);

        // Set active profiles
        setUser({ id: impersonatedUserId } as User);
        setProfile(impersonatedUserData);

        console.log("Restored impersonation session");
      } catch (error: any) {
        console.error('Error restoring impersonation session:', error);
        // If there's an error, clear the impersonation state
        localStorage.removeItem('impersonationActive');
        localStorage.removeItem('impersonatedUserId');
        localStorage.removeItem('originalUserId');
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading, 
      signOut, 
      impersonatedUser,
      impersonatedProfile,
      isImpersonating,
      startImpersonation,
      endImpersonation
    }}>
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
