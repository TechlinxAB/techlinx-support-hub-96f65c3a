
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  companyId?: string;
  preferredLanguage?: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Case {
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

export interface Reply {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export interface Note {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
}

// Export type aliases for backward compatibility
export type CaseStatus = Case['status'];
export type CasePriority = Case['priority'];
export type UserRole = User['role'];
export type Language = User['preferredLanguage'];

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
  addCase: (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Case>;
  updateCase: (id: string, updates: Partial<Case>) => Promise<void>;
  addReply: (newReply: Omit<Reply, 'id' | 'createdAt'>) => Promise<Reply>;
  addNote: (newNote: Omit<Note, 'id' | 'createdAt'>) => Promise<Note>;
  refetchCases: () => Promise<void>;
  refetchReplies: (caseId?: string) => Promise<void>;
  refetchNotes: (caseId?: string) => Promise<void>;
  refetchUsers: () => Promise<void>;
  refetchCompanies: () => Promise<void>;
  refetchCategories: () => Promise<void>;
  addCompany: (company: Omit<Company, 'id'>) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
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
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      const formattedUsers = data?.map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        phone: profile.phone,
        companyId: profile.company_id,
        preferredLanguage: profile.preferred_language
      })) || [];
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const refetchUsers = fetchUsers;

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const refetchCompanies = fetchCompanies;

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const refetchCategories = fetchCategories;

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

  const addCase = async (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .insert([{
          ...newCase,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create new case');

      const formattedCase = {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setCases(prevCases => [...prevCases, formattedCase]);
      return formattedCase;
    } catch (error) {
      console.error('Error adding case:', error);
      throw error;
    }
  };

  const updateCase = async (id: string, updates: Partial<Case>) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
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

  const addReply = async (newReply: Omit<Reply, 'id' | 'createdAt'>): Promise<Reply> => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .insert([{
          ...newReply,
          case_id: newReply.caseId,
          user_id: newReply.userId,
          is_internal: newReply.isInternal,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create new reply');
      
      const formattedReply = {
        id: data.id,
        caseId: data.case_id,
        userId: data.user_id,
        content: data.content,
        createdAt: data.created_at,
        isInternal: data.is_internal
      };
      
      setReplies(prevReplies => [...prevReplies, formattedReply]);
      return formattedReply;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  };

  const addNote = async (newNote: Omit<Note, 'id' | 'createdAt'>): Promise<Note> => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          ...newNote,
          case_id: newNote.caseId,
          user_id: newNote.userId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create new note');
      
      const formattedNote = {
        id: data.id,
        caseId: data.case_id,
        userId: data.user_id,
        content: data.content,
        createdAt: data.created_at
      };
      
      setNotes(prevNotes => [...prevNotes, formattedNote]);
      return formattedNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const addCompany = async (company: Omit<Company, 'id'>): Promise<Company> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create company');

      setCompanies(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding company:', error);
      throw error;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting company:', error);
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
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const formattedReplies = data?.map(reply => ({
        id: reply.id,
        caseId: reply.case_id,
        userId: reply.user_id,
        content: reply.content,
        createdAt: reply.created_at,
        isInternal: reply.is_internal
      })) || [];
      
      setReplies(formattedReplies);
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
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const formattedNotes = data?.map(note => ({
        id: note.id,
        caseId: note.case_id,
        userId: note.user_id,
        content: note.content,
        createdAt: note.created_at
      })) || [];
      
      setNotes(formattedNotes);
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
    refetchUsers,
    refetchCompanies,
    refetchCategories,
    addCompany,
    updateCompany,
    deleteCompany,
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
