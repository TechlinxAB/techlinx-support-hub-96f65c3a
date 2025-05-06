
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Define types
export type UserRole = 'user' | 'consultant';
export type CaseStatus = 'new' | 'ongoing' | 'resolved' | 'completed' | 'draft';
export type CasePriority = 'low' | 'medium' | 'high';
export type Language = 'en' | 'sv';

export interface Company {
  id: string;
  name: string;
  logo?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyId: string;
  role: UserRole;
  preferredLanguage: Language;
  avatar?: string;
}

export interface CaseCategory {
  id: string;
  name: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  status: CaseStatus;
  priority: CasePriority;
  userId: string;
  companyId: string;
  categoryId: string;
  assignedToId?: string;
}

export interface Reply {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface Note {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

// Create context
interface AppContextType {
  // Data
  companies: Company[];
  users: User[];
  cases: Case[];
  categories: CaseCategory[];
  replies: Reply[];
  notes: Note[];
  
  // Current state
  currentUser: User | null;
  language: Language;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setLanguage: (language: Language) => void;
  addCase: (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
  updateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  addReply: (reply: Omit<Reply, 'id' | 'createdAt'>) => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  loadingCases: boolean;
  loadingReplies: boolean;
  loadingNotes: boolean;
  refetchCases: () => Promise<void>;
  refetchReplies: (caseId?: string) => Promise<void>;
  refetchNotes: (caseId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [casesData, setCasesData] = useState<Case[]>([]);
  const [repliesData, setRepliesData] = useState<Reply[]>([]);
  const [notesData, setNotesData] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CaseCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [loadingReplies, setLoadingReplies] = useState<boolean>(true);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch data when authenticated
  useEffect(() => {
    if (user && profile) {
      fetchData();
      
      // Map profile to currentUser
      const mappedUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || undefined,
        companyId: profile.company_id || '',
        role: profile.role as UserRole,
        preferredLanguage: (profile.preferred_language as Language) || 'en',
        avatar: profile.avatar || undefined,
      };
      
      setCurrentUser(mappedUser);
      setLanguage(mappedUser.preferredLanguage);
    }
  }, [user, profile]);

  const fetchData = async () => {
    await Promise.all([
      fetchCategories(),
      fetchCompanies(),
      fetchUsers(),
      fetchCases(),
    ]);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const mappedCategories: CaseCategory[] = data.map(cat => ({
          id: cat.id,
          name: cat.name
        }));
        setCategories(mappedCategories);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error.message);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const mappedCompanies: Company[] = data.map(company => ({
          id: company.id,
          name: company.name,
          logo: company.logo
        }));
        setCompanies(mappedCompanies);
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const mappedUsers: User[] = data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || undefined,
          companyId: user.company_id || '',
          role: user.role as UserRole,
          preferredLanguage: (user.preferred_language as Language) || 'en',
          avatar: user.avatar
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
    }
  };

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const mappedCases: Case[] = data.map(caseItem => ({
          id: caseItem.id,
          title: caseItem.title,
          description: caseItem.description,
          createdAt: new Date(caseItem.created_at),
          updatedAt: new Date(caseItem.updated_at),
          status: caseItem.status as CaseStatus,
          priority: caseItem.priority as CasePriority,
          userId: caseItem.user_id,
          companyId: caseItem.company_id,
          categoryId: caseItem.category_id,
          assignedToId: caseItem.assigned_to_id
        }));
        setCasesData(mappedCases);
      }
    } catch (error: any) {
      console.error('Error fetching cases:', error.message);
    } finally {
      setLoadingCases(false);
    }
  };

  const refetchCases = async () => {
    await fetchCases();
  };

  const fetchReplies = async (caseId?: string) => {
    setLoadingReplies(true);
    try {
      let query = supabase
        .from('replies')
        .select('*');
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        const mappedReplies: Reply[] = data.map(reply => ({
          id: reply.id,
          caseId: reply.case_id,
          userId: reply.user_id,
          content: reply.content,
          createdAt: new Date(reply.created_at),
          isInternal: reply.is_internal
        }));
        setRepliesData(mappedReplies);
      }
    } catch (error: any) {
      console.error('Error fetching replies:', error.message);
    } finally {
      setLoadingReplies(false);
    }
  };

  const refetchReplies = async (caseId?: string) => {
    await fetchReplies(caseId);
  };

  const fetchNotes = async (caseId?: string) => {
    setLoadingNotes(true);
    try {
      let query = supabase
        .from('notes')
        .select('*');
      
      if (caseId) {
        query = query.eq('case_id', caseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        const mappedNotes: Note[] = data.map(note => ({
          id: note.id,
          caseId: note.case_id,
          userId: note.user_id,
          content: note.content,
          createdAt: new Date(note.created_at)
        }));
        setNotesData(mappedNotes);
      }
    } catch (error: any) {
      console.error('Error fetching notes:', error.message);
    } finally {
      setLoadingNotes(false);
    }
  };

  const refetchNotes = async (caseId?: string) => {
    await fetchNotes(caseId);
  };

  // Actions
  const addCase = async (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | undefined> => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .insert({
          title: newCase.title,
          description: newCase.description,
          status: newCase.status,
          priority: newCase.priority,
          user_id: newCase.userId,
          company_id: newCase.companyId,
          category_id: newCase.categoryId,
          assigned_to_id: newCase.assignedToId,
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        await refetchCases();
        toast({
          title: "Case Created",
          description: "Your case has been successfully created",
        });
        return data[0].id;
      }
    } catch (error: any) {
      console.error('Error adding case:', error.message);
      toast({
        title: "Error Creating Case",
        description: error.message,
        variant: "destructive",
      });
    }
    return undefined;
  };

  const updateCase = async (caseId: string, updates: Partial<Case>) => {
    try {
      // Convert from camelCase to snake_case for Supabase
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
      if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.assignedToId !== undefined) dbUpdates.assigned_to_id = updates.assignedToId;
      
      const { error } = await supabase
        .from('cases')
        .update(dbUpdates)
        .eq('id', caseId);
      
      if (error) throw error;
      
      await refetchCases();
      
      toast({
        title: "Case Updated",
        description: "The case has been successfully updated",
      });
    } catch (error: any) {
      console.error('Error updating case:', error.message);
      toast({
        title: "Error Updating Case",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addReply = async (reply: Omit<Reply, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('replies')
        .insert({
          case_id: reply.caseId,
          user_id: reply.userId,
          content: reply.content,
          is_internal: reply.isInternal
        });
      
      if (error) throw error;
      
      await refetchReplies(reply.caseId);
      
      toast({
        title: "Reply Added",
        description: "Your reply has been added successfully",
      });
    } catch (error: any) {
      console.error('Error adding reply:', error.message);
      toast({
        title: "Error Adding Reply",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addNote = async (note: Omit<Note, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          case_id: note.caseId,
          user_id: note.userId,
          content: note.content
        });
      
      if (error) throw error;
      
      await refetchNotes(note.caseId);
      
      toast({
        title: "Note Added",
        description: "Your note has been added successfully",
      });
    } catch (error: any) {
      console.error('Error adding note:', error.message);
      toast({
        title: "Error Adding Note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        users,
        cases: casesData,
        categories,
        replies: repliesData,
        notes: notesData,
        currentUser,
        language,
        setCurrentUser,
        setLanguage,
        addCase,
        updateCase,
        addReply,
        addNote,
        loadingCases,
        loadingReplies,
        loadingNotes,
        refetchCases,
        refetchReplies,
        refetchNotes
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
