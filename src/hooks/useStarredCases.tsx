
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const BASE_STORAGE_KEY = 'starredCases';

export const useStarredCases = () => {
  const [starredCases, setStarredCases] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();
  
  // Create a user-specific storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `${BASE_STORAGE_KEY}_${user.id}` : BASE_STORAGE_KEY;
  }, [user?.id]);

  // Load starred cases from localStorage with user-specific key
  const loadStarredCases = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      const savedStarredCases = localStorage.getItem(storageKey);
      if (savedStarredCases) {
        setStarredCases(JSON.parse(savedStarredCases));
      } else {
        setStarredCases([]); // Reset when switching users
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading starred cases:', error);
      setIsLoaded(true);
    }
  }, [getStorageKey]);

  // Save starred cases to localStorage with user-specific key
  const saveStarredCases = useCallback((cases: string[]) => {
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(cases));
      setStarredCases(cases);
    } catch (error) {
      console.error('Error saving starred cases:', error);
    }
  }, [getStorageKey]);

  // Add a case to starred cases
  const starCase = useCallback((caseId: string) => {
    setStarredCases(prev => {
      const updated = [...prev, caseId];
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  // Remove a case from starred cases
  const unstarCase = useCallback((caseId: string) => {
    setStarredCases(prev => {
      const updated = prev.filter(id => id !== caseId);
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  // Toggle star status for a case
  const toggleStar = useCallback((caseId: string) => {
    if (starredCases.includes(caseId)) {
      unstarCase(caseId);
    } else {
      starCase(caseId);
    }
  }, [starredCases, starCase, unstarCase]);

  // Check if a case is starred
  const isStarred = useCallback((caseId: string) => {
    return starredCases.includes(caseId);
  }, [starredCases]);

  // Load starred cases when component mounts or user changes
  useEffect(() => {
    if (user?.id || !isLoaded) {
      loadStarredCases();
    }
  }, [isLoaded, loadStarredCases, user?.id]);

  return {
    starredCases,
    loadStarredCases,
    saveStarredCases,
    starCase,
    unstarCase,
    toggleStar,
    isStarred,
    isLoaded
  };
};
