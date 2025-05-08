import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardBlock } from '@/types/dashboard';
import { CompanyNewsBlock } from '@/types/companyNews';

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

// Utility function for API requests with retry logic
const fetchWithRetry = async <T,>(
  apiCall: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  delayMs = 300
): Promise<T> => {
  let retries = 0;
  
  while (true) {
    try {
      const { data, error } = await apiCall();
      
      if (error) {
        throw error;
      }
      
      if (data === null) {
        throw new Error("No data returned");
      }
      
      return data as T;
    } catch (error) {
      retries++;
      console.log(`API call failed. Retry ${retries}/${maxRetries}`);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = delayMs * Math.pow(2, retries - 1) + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Create context
interface AppContextType {
  // Data
  companies: Company[];
  users: User[];
  cases: Case[];
  categories: CaseCategory[];
  replies: Reply[];
  notes: Note[];
  dashboardBlocks: DashboardBlock[];
  companyNewsBlocks: CompanyNewsBlock[];
  
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
  loadingDashboardBlocks: boolean;
  loadingCompanyNewsBlocks: boolean;
  refetchCases: () => Promise<void>;
  refetchReplies: (caseId?: string) => Promise<void>;
  refetchNotes: (caseId?: string) => Promise<void>;
  
  // Dashboard block actions
  addDashboardBlock: (block: Omit<DashboardBlock, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string | undefined>;
  updateDashboardBlock: (blockId: string, updates: Partial<DashboardBlock>) => Promise<void>;
  deleteDashboardBlock: (blockId: string) => Promise<void>;
  refetchDashboardBlocks: (companyId?: string) => Promise<void>;

  // Company news block actions
  addCompanyNewsBlock: (block: Omit<CompanyNewsBlock, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string | undefined>;
  updateCompanyNewsBlock: (blockId: string, updates: Partial<CompanyNewsBlock>) => Promise<void>;
  deleteCompanyNewsBlock: (blockId: string) => Promise<void>;
  publishCompanyNewsBlock: (blockId: string, isPublished: boolean) => Promise<void>;
  refetchCompanyNewsBlocks: (companyId?: string) => Promise<void>;

  // Company management
  addCompany: (company: Omit<Company, 'id'>) => Promise<string | undefined>;
  updateCompany: (companyId: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  refetchCompanies: () => Promise<void>;
  
  // User management
  refetchUsers: () => Promise<void>;
  
  // Function to delete a reply
  deleteReply: (replyId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [casesData, setCasesData] = useState<Case[]>([]);
  const [repliesData, setRepliesData] = useState<Reply[]>([]);
  const [notesData, setNotesData] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CaseCategory[]>([]);
  const [dashboardBlocks, setDashboardBlocks] = useState<DashboardBlock[]>([]);
  const [companyNewsBlocks, setCompanyNewsBlocks] = useState<CompanyNewsBlock[]>([]);
  const [loadingDashboardBlocks, setLoadingDashboardBlocks] = useState<boolean>(true);
  const [loadingCompanyNewsBlocks, setLoadingCompanyNewsBlocks] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [loadingReplies, setLoadingReplies] = useState<boolean>(true);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // Cache for API responses to reduce redundant fetches
  const apiCache = React.useRef<{
    [key: string]: {
      data: any;
      timestamp: number;
    }
  }>({}).current;

  const getCachedOrFetch = async <T,>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    cacheMaxAgeSec = 60 // Default 1 minute
  ): Promise<T> => {
    const now = Date.now();
    const cachedEntry = apiCache[cacheKey];
    
    if (cachedEntry && (now - cachedEntry.timestamp) / 1000 < cacheMaxAgeSec) {
      console.log(`Using cached response for ${cacheKey}`);
      return cachedEntry.data;
    }
    
    // Otherwise fetch and cache
    const data = await fetchFn();
    apiCache[cacheKey] = {
      data,
      timestamp: now
    };
    
    return data;
  };
  
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
      fetchDashboardBlocks(),
      fetchCompanyNewsBlocks(),
    ]);
  };

  const fetchCategories = async () => {
    try {
      const data = await getCachedOrFetch(
        'categories',
        async () => {
          const { data, error } = await supabase
            .from('categories')
            .select('*');
          
          if (error) throw error;
          return data || [];
        },
        300 // Categories change rarely - cache for 5 minutes
      );
      
      const mappedCategories: CaseCategory[] = data.map((cat: any) => ({
        id: cat.id,
        name: cat.name
      }));
      setCategories(mappedCategories);
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
      if (!data) return;
      
      const mappedCompanies: Company[] = data.map((company: any) => ({
        id: company.id,
        name: company.name,
        logo: company.logo || undefined
      }));
      setCompanies(mappedCompanies);
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
      if (!data) return;
      
      const mappedUsers: User[] = data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        companyId: user.company_id || '',
        role: user.role as UserRole,
        preferredLanguage: (user.preferred_language as Language) || 'en',
        avatar: user.avatar || undefined
      }));
      setUsers(mappedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
    }
  };

  const refetchUsers = async () => {
    // Clear cache and force refresh
    delete apiCache['users'];
    await fetchUsers();
  };

  const refetchCompanies = async () => {
    // Clear cache and force refresh
    delete apiCache['companies'];
    await fetchCompanies();
  };

  const addCompany = async (company: Omit<Company, 'id'>): Promise<string | undefined> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          logo: company.logo
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        await refetchCompanies();
        toast({
          title: "Company Created",
          description: "The company has been successfully created",
        });
        return data[0].id;
      }
    } catch (error: any) {
      console.error('Error adding company:', error.message);
      toast({
        title: "Error Creating Company",
        description: error.message,
        variant: "destructive",
      });
    }
    return undefined;
  };

  const updateCompany = async (companyId: string, updates: Partial<Company>) => {
    try {
      // Convert from camelCase to snake_case for Supabase
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
      
      const { error } = await supabase
        .from('companies')
        .update(dbUpdates)
        .eq('id', companyId);
      
      if (error) throw error;
      
      await refetchCompanies();
      
      toast({
        title: "Company Updated",
        description: "The company has been successfully updated",
      });
    } catch (error: any) {
      console.error('Error updating company:', error.message);
      toast({
        title: "Error Updating Company",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
      
      if (error) throw error;
      
      await refetchCompanies();
      
      toast({
        title: "Company Deleted",
        description: "The company has been successfully deleted",
      });
    } catch (error: any) {
      console.error('Error deleting company:', error.message);
      toast({
        title: "Error Deleting Company",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      // Fix the type issue by using the proper async/await pattern
      const { data, error } = await supabase.from('cases').select('*');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const mappedCases: Case[] = data.map((caseItem: any) => ({
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
      toast({
        title: "Error",
        description: "Could not load cases. Please try again later.",
        variant: "destructive",
      });
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
      
      if (error) {
        console.error('Error fetching replies:', error.message);
        throw error;
      }
      
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
      console.error('Error fetching replies:', error);
      toast({
        title: "Error",
        description: "Could not load discussion replies. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingReplies(false);
    }
  };

  const refetchReplies = async (caseId?: string) => {
    return await fetchReplies(caseId);
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
      
      if (error) {
        console.error('Error fetching notes:', error.message);
        throw error;
      }
      
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
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Could not load discussion notes. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingNotes(false);
    }
  };

  const refetchNotes = async (caseId?: string) => {
    return await fetchNotes(caseId);
  };

  const fetchDashboardBlocks = async (companyId?: string) => {
    setLoadingDashboardBlocks(true);
    try {
      let query = supabase
        .from('dashboard_blocks')
        .select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        const mappedBlocks: DashboardBlock[] = data.map(block => ({
          id: block.id,
          companyId: block.company_id,
          title: block.title,
          content: block.content,
          type: block.type as DashboardBlock['type'], // Cast to ensure compatibility
          position: block.position,
          parentId: block.parent_id || undefined,
          createdAt: new Date(block.created_at),
          updatedAt: new Date(block.updated_at),
          createdBy: block.created_by
        }));
        setDashboardBlocks(mappedBlocks);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard blocks:', error.message);
    } finally {
      setLoadingDashboardBlocks(false);
    }
  };

  const refetchDashboardBlocks = async (companyId?: string) => {
    await fetchDashboardBlocks(companyId);
  };

  const addDashboardBlock = async (
    block: Omit<DashboardBlock, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string | undefined> => {
    try {
      // Ensure we have the current user's ID
      if (!user) {
        throw new Error('User must be logged in to add dashboard blocks');
      }

      const { data, error } = await supabase
        .from('dashboard_blocks')
        .insert({
          company_id: block.companyId,
          title: block.title,
          content: block.content,
          type: block.type,
          position: block.position,
          parent_id: block.parentId,
          created_by: user.id // Add the user ID as created_by
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        await refetchDashboardBlocks(block.companyId);
        toast({
          title: "Block Created",
          description: "Your dashboard block has been successfully created",
        });
        return data[0].id;
      }
    } catch (error: any) {
      console.error('Error adding dashboard block:', error.message);
      toast({
        title: "Error Creating Block",
        description: error.message,
        variant: "destructive",
      });
    }
    return undefined;
  };

  const updateDashboardBlock = async (blockId: string, updates: Partial<DashboardBlock>) => {
    try {
      // Convert from camelCase to snake_case for Supabase
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
      
      const { error } = await supabase
        .from('dashboard_blocks')
        .update(dbUpdates)
        .eq('id', blockId);
      
      if (error) throw error;
      
      // Find the company ID for refetching
      const blockToUpdate = dashboardBlocks.find(block => block.id === blockId);
      if (blockToUpdate) {
        await refetchDashboardBlocks(blockToUpdate.companyId);
      }
      
      toast({
        title: "Block Updated",
        description: "The dashboard block has been successfully updated",
      });
    } catch (error: any) {
      console.error('Error updating dashboard block:', error.message);
      toast({
        title: "Error Updating Block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteDashboardBlock = async (blockId: string) => {
    try {
      // Find the company ID for refetching before deletion
      const blockToDelete = dashboardBlocks.find(block => block.id === blockId);
      const companyId = blockToDelete?.companyId;
      
      const { error } = await supabase
        .from('dashboard_blocks')
        .delete()
        .eq('id', blockId);
      
      if (error) throw error;
      
      if (companyId) {
        await refetchDashboardBlocks(companyId);
      }
      
      toast({
        title: "Block Deleted",
        description: "The dashboard block has been successfully deleted",
      });
    } catch (error: any) {
      console.error('Error deleting dashboard block:', error.message);
      toast({
        title: "Error Deleting Block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchCompanyNewsBlocks = async (companyId?: string) => {
    setLoadingCompanyNewsBlocks(true);
    try {
      let query = supabase
        .from('company_news_blocks')
        .select('*');
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        const mappedBlocks: CompanyNewsBlock[] = data.map(block => ({
          id: block.id,
          companyId: block.company_id,
          title: block.title,
          content: block.content,
          type: block.type as CompanyNewsBlock['type'],
          position: block.position,
          parentId: block.parent_id || undefined,
          createdAt: new Date(block.created_at),
          updatedAt: new Date(block.updated_at),
          createdBy: block.created_by,
          isPublished: block.is_published || false
        }));
        setCompanyNewsBlocks(mappedBlocks);
      }
    } catch (error: any) {
      console.error('Error fetching company news blocks:', error.message);
    } finally {
      setLoadingCompanyNewsBlocks(false);
    }
  };

  const refetchCompanyNewsBlocks = async (companyId?: string) => {
    await fetchCompanyNewsBlocks(companyId);
  };

  const addCompanyNewsBlock = async (
    block: Omit<CompanyNewsBlock, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string | undefined> => {
    try {
      // Ensure we have the current user's ID
      if (!user) {
        throw new Error('User must be logged in to add company news blocks');
      }

      const { data, error } = await supabase
        .from('company_news_blocks')
        .insert({
          company_id: block.companyId,
          title: block.title,
          content: block.content,
          type: block.type,
          position: block.position,
          parent_id: block.parentId,
          created_by: user.id,
          is_published: block.isPublished
        })
        .select();
      
      if (error) throw error;
      
      if (data && data[0]) {
        await refetchCompanyNewsBlocks(block.companyId);
        toast({
          title: "News Block Created",
          description: "Your news block has been successfully created",
        });
        return data[0].id;
      }
    } catch (error: any) {
      console.error('Error adding company news block:', error.message);
      toast({
        title: "Error Creating Block",
        description: error.message,
        variant: "destructive",
      });
    }
    return undefined;
  };

  const updateCompanyNewsBlock = async (blockId: string, updates: Partial<CompanyNewsBlock>) => {
    try {
      // Convert from camelCase to snake_case for Supabase
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
      if (updates.isPublished !== undefined) dbUpdates.is_published = updates.isPublished;
      
      const { error } = await supabase
        .from('company_news_blocks')
        .update(dbUpdates)
        .eq('id', blockId);
      
      if (error) throw error;
      
      // Find the company ID for refetching
      const blockToUpdate = companyNewsBlocks.find(block => block.id === blockId);
      if (blockToUpdate) {
        await refetchCompanyNewsBlocks(blockToUpdate.companyId);
      }
      
      toast({
        title: "News Block Updated",
        description: "The news block has been successfully updated",
      });
    } catch (error: any) {
      console.error('Error updating company news block:', error.message);
      toast({
        title: "Error Updating Block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCompanyNewsBlock = async (blockId: string) => {
    try {
      // Find the company ID for refetching before deletion
      const blockToDelete = companyNewsBlocks.find(block => block.id === blockId);
      const companyId = blockToDelete?.companyId;
      
      const { error } = await supabase
        .from('company_news_blocks')
        .delete()
        .eq('id', blockId);
      
      if (error) throw error;
      
      if (companyId) {
        await refetchCompanyNewsBlocks(companyId);
      }
      
      toast({
        title: "News Block Deleted",
        description: "The news block has been successfully deleted",
      });
    } catch (error: any) {
      console.error('Error deleting company news block:', error.message);
      toast({
        title: "Error Deleting Block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publishCompanyNewsBlock = async (blockId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('company_news_blocks')
        .update({ is_published: isPublished })
        .eq('id', blockId);
      
      if (error) throw error;
      
      // Find the company ID for refetching
      const blockToUpdate = companyNewsBlocks.find(block => block.id === blockId);
      if (blockToUpdate) {
        await refetchCompanyNewsBlocks(blockToUpdate.companyId);
      }
      
      toast({
        title: isPublished ? "News Block Published" : "News Block Unpublished",
        description: `The news block has been successfully ${isPublished ? 'published' : 'unpublished'}`,
      });
    } catch (error: any) {
      console.error('Error updating company news block publish status:', error.message);
      toast({
        title: "Error Updating Block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Actions
  const addCase = async (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | undefined> => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .insert({
          title: newCase.title,
          description: newCase.description,
          status: newCase.status as "new" | "ongoing" | "resolved" | "completed" | "draft",
          priority: newCase.priority as "low" | "medium" | "high",
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
      if (updates.status !== undefined) dbUpdates.status = updates.status as "new" | "ongoing" | "resolved" | "completed" | "draft";
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority as "low" | "medium" | "high";
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
      throw error; // Re-throw to allow caller to handle
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
    } catch (error: any) {
      console.error('Error adding reply:', error.message);
      toast({
        title: "Error Adding Reply",
        description: error.message,
        variant: "destructive",
      });
      throw error; // Re-throw to allow caller to handle
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
    } catch (error: any) {
      console.error('Error adding note:', error.message);
      toast({
        title: "Error Adding Note",
        description: error.message,
        variant: "destructive",
      });
      throw error; // Re-throw to allow caller to handle
    }
  };

  // Function to delete a reply
  const deleteReply = async (replyId: string): Promise<void> => {
    try {
      // Make the API call to delete the reply
      await supabase.from('replies').delete().match({ id: replyId });
      
      // Update the local state
      setReplies(prev => prev.filter(reply => reply.id !== replyId));
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  };

  // Make sure to include the new function in the context value
  const contextValue: AppContextType = {
    companies,
    users,
    cases: casesData,
    categories,
    replies: repliesData,
    notes: notesData,
    dashboardBlocks,
    companyNewsBlocks,
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
    loadingDashboardBlocks,
    loadingCompanyNewsBlocks,
    refetchCases,
    refetchReplies,
    refetchNotes,
    addDashboardBlock,
    updateDashboardBlock,
    deleteDashboardBlock,
    refetchDashboardBlocks,
    addCompanyNewsBlock,
    updateCompanyNewsBlock,
    deleteCompanyNewsBlock,
    publishCompanyNewsBlock,
    refetchCompanyNewsBlocks,
    addCompany,
    updateCompany,
    deleteCompany,
    refetchCompanies,
    refetchUsers,
    deleteReply,
  };

  return (
    <AppContext.Provider value={contextValue}>
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
