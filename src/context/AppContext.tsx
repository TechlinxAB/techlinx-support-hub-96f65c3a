import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Case {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'ongoing' | 'resolved' | 'completed' | 'draft';
  priority: 'low' | 'medium' | 'high';
  companyId: string;
  userId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

interface Reply {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

interface Note {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  companies: Company[];
  cases: Case[];
  replies: Reply[];
  notes: Note[];
  categories: Category[];
  loadingCases: boolean;
  loadingReplies: boolean;
  loadingNotes: boolean;
  fetchUsers: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCases: () => Promise<void>;
  addCase: (newCase: Omit<Case, 'id'>) => Promise<Case>;
  updateCase: (id: string, updates: Partial<Case>) => Promise<void>;
  addReply: (newReply: Omit<Reply, 'id'>) => Promise<Reply>;
  addNote: (newNote: Omit<Note, 'id'>) => Promise<Note>;
  refetchCases: () => Promise<void>;
  refetchReplies: (caseId?: string) => Promise<void>;
  refetchNotes: (caseId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoadingCases(false);
    }
  };

  const addCase = async (newCase: Omit<Case, 'id'>): Promise<Case> => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .insert([newCase])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create new case');

      setCases(prevCases => [...prevCases, data]);
      return data;
    } catch (error) {
      console.error('Error adding case:', error);
      throw error;
    }
  };

  const updateCase = async (id: string, updates: Partial<Case>) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCases(prevCases =>
        prevCases.map(c => (c.id === id ? { ...c, ...updates } : c))
      );
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  };

  const addReply = async (newReply: Omit<Reply, 'id'>): Promise<Reply> => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .insert([newReply])
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create new reply');
      
      setReplies(prevReplies => [...prevReplies, data]);
      return data;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  };

  const addNote = async (newNote: Omit<Note, 'id'>): Promise<Note> => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([newNote])
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create new note');
      
      setNotes(prevNotes => [...prevNotes, data]);
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const refetchCases = async () => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error refetching cases:', error);
      throw error;
    } finally {
      setLoadingCases(false);
    }
  };

  const refetchReplies = async (caseId?: string) => {
    setLoadingReplies(true);
    try {
      let query = supabase
        .from('replies')
        .select('*')
        .is('deleted_at', null) // Filter out deleted replies
        .order('created_at', { ascending: true });
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
      throw error;
    } finally {
      setLoadingReplies(false);
    }
  };

  const refetchNotes = async (caseId?: string) => {
    setLoadingNotes(true);
    try {
      let query = supabase
        .from('notes')
        .select('*')
        .is('deleted_at', null) // Filter out deleted notes
        .order('created_at', { ascending: true });
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    fetchCategories();
    fetchCases();
    
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    users,
    companies,
    cases,
    replies,
    notes,
    categories,
    loadingCases,
    loadingReplies,
    loadingNotes,
    fetchUsers,
    fetchCompanies,
    fetchCategories,
    fetchCases,
    addCase,
    updateCase,
    addReply,
    addNote,
    refetchCases,
    refetchReplies,
    refetchNotes,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
