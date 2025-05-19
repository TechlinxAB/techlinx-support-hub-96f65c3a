
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserProfile } from './AuthContext';

// Type definitions for the AppContext
type AppContextType = {
  language: 'en' | 'sv';
  setLanguage: (language: 'en' | 'sv') => void;
  currentUser: UserProfile | null;
  cases: any[] | null;
};

// Create the context with default values
const AppContext = createContext<AppContextType>({
  language: 'en',
  setLanguage: () => {},
  currentUser: null,
  cases: null,
});

// Provider component to wrap the app
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<'en' | 'sv'>('en');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<any[] | null>(null);
  
  // Get auth data SAFELY by accessing it only after loading is complete
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;

    // Now safe to use user/profile
    setCurrentUser(profile);
    
    // Simulate fetching cases
    const mockCases = [
      {
        id: '1',
        title: 'Cannot access email',
        status: 'ongoing',
        priority: 'high',
        userId: profile.id,
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Need software installation',
        status: 'new',
        priority: 'medium',
        userId: profile.id,
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        id: '3',
        title: 'Password reset',
        status: 'resolved',
        priority: 'low',
        userId: profile.id,
        updatedAt: new Date(Date.now() - 172800000),
      },
    ];
    
    setCases(mockCases);
  }, [loading, user, profile]);

  // Provide the context values
  const contextValue = {
    language,
    setLanguage,
    currentUser,
    cases,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Custom hook to use the AppContext
export const useAppContext = () => {
  return useContext(AppContext);
};
