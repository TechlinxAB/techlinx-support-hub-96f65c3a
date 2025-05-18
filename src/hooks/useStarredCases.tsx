
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'starredCases';

export const useStarredCases = () => {
  const [starredCases, setStarredCases] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load starred cases from localStorage
  const loadStarredCases = useCallback(() => {
    try {
      const savedStarredCases = localStorage.getItem(STORAGE_KEY);
      if (savedStarredCases) {
        setStarredCases(JSON.parse(savedStarredCases));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading starred cases:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save starred cases to localStorage
  const saveStarredCases = useCallback((cases: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      setStarredCases(cases);
    } catch (error) {
      console.error('Error saving starred cases:', error);
    }
  }, []);

  // Add a case to starred cases
  const starCase = useCallback((caseId: string) => {
    setStarredCases(prev => {
      const updated = [...prev, caseId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove a case from starred cases
  const unstarCase = useCallback((caseId: string) => {
    setStarredCases(prev => {
      const updated = prev.filter(id => id !== caseId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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

  // Load starred cases on component mount
  useEffect(() => {
    if (!isLoaded) {
      loadStarredCases();
    }
  }, [isLoaded, loadStarredCases]);

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
