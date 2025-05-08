
import React, { 
  createContext, 
  useState, 
  useEffect, 
  useContext, 
  useCallback 
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadAttachment } from '@/utils/supabaseStorage';

export interface User {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  role: 'user' | 'consultant';
  companyId?: string; // Add companyId to User interface
}

export interface Company {
  id: string;
  createdAt: string;
  name: string;
  description: string;
}

export interface Category {
  id: string;
  createdAt: string;
  name: string;
  description: string;
}

// Define case status and priority types explicitly
export type CaseStatus = 'new' | 'ongoing' | 'resolved' | 'completed' | 'draft';
export type CasePriority = 'low' | 'medium' | 'high';

export interface Case {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  companyId: string;
  userId: string;
  categoryId: string;
  assignedToId?: string; // Add optional assignedToId
}

export interface Note {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ReplyAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface Reply {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments?: ReplyAttachment[];
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  companies: Company[];
  categories: Category[];
  cases: Case[];
  replies: Reply[];
  notes: Note[];
  language?: string; // Add language
  setLanguage?: (lang: string) => void; // Add setLanguage
  loadingUsers: boolean;
  loadingCompanies: boolean;
  loadingCategories: boolean;
  loadingCases: boolean;
  loadingReplies: boolean;
  loadingNotes: boolean;
  fetchUsers: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCases: () => Promise<void>;
  refetchCases: () => Promise<void>;
  fetchReplies: (caseId: string) => Promise<void>;
  refetchReplies: (caseId: string) => Promise<void>;
  fetchNotes: (caseId: string) => Promise<void>;
  refetchNotes: (caseId: string) => Promise<void>;
  addCompany: (data: { name: string; description: string }) => Promise<Company>;
  addCategory: (data: { name: string; description: string }) => Promise<Category>;
  addCase: (data: { 
    title: string; 
    description: string; 
    status: string; 
    priority: string; 
    companyId: string; 
    categoryId: string 
  }) => Promise<Case>;
  updateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  addReply: (data: { caseId: string; userId: string; content: string; isInternal: boolean; attachments?: File[] }) => Promise<Reply>;
  deleteReply: (replyId: string) => Promise<void>;
  addNote: (data: { caseId: string; userId: string; content: string }) => Promise<Note>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [replies, setRepliesData] = useState<Reply[]>([]);
  const [notes, setNotesData] = useState<Note[]>([]);
  const [language, setLanguage] = useState<string>('en'); // Add language state
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // User Management
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles') // Change from "users" to "profiles"
        .select('*');
      
      if (error) throw error;
      
      // Transform profile data to User interface
      const transformedUsers = data.map(profile => ({
        id: profile.id,
        createdAt: profile.created_at,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        companyId: profile.company_id
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Company Management
  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*');
      
      if (error) throw error;
      
      // Transform company data to Company interface
      const transformedCompanies = data.map(company => ({
        id: company.id,
        createdAt: company.created_at,
        name: company.name,
        description: company.name // For backward compatibility, using name as description temporarily
      }));
      
      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);
  
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
  
  const addCompany = async (data: { name: string; description: string }) => {
    try {
      const { data: companyData, error } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          // Note: The description field isn't in the database schema, so we don't include it
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newCompany: Company = {
        id: companyData.id,
        createdAt: companyData.created_at,
        name: companyData.name,
        description: data.description // Maintain application-side description
      };
      
      setCompanies(prev => [...prev, newCompany]);
      return newCompany;
    } catch (error) {
      console.error('Error adding company:', error);
      throw error;
    }
  };
  
  // Category Management
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (error) throw error;
      
      // Transform category data to Category interface
      const transformedCategories = data.map(category => ({
        id: category.id,
        createdAt: category.created_at,
        name: category.name,
        description: category.name // For backward compatibility, using name as description temporarily
      }));
      
      setCategories(transformedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);
  
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  const addCategory = async (data: { name: string; description: string }) => {
    try {
      const { data: categoryData, error } = await supabase
        .from('categories')
        .insert({
          name: data.name,
          // Note: The description field isn't in the database schema, so we don't include it
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newCategory: Category = {
        id: categoryData.id,
        createdAt: categoryData.created_at,
        name: categoryData.name,
        description: data.description // Maintain application-side description
      };
      
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };
  
  // Cases Management
  const fetchCases = useCallback(async () => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*');
      
      if (error) throw error;
      
      // Transform cases data to Case interface
      const transformedCases = data.map(caseItem => ({
        id: caseItem.id,
        createdAt: caseItem.created_at,
        updatedAt: caseItem.updated_at,
        title: caseItem.title,
        description: caseItem.description,
        status: caseItem.status,
        priority: caseItem.priority,
        companyId: caseItem.company_id,
        userId: caseItem.user_id,
        categoryId: caseItem.category_id,
        assignedToId: caseItem.assigned_to_id
      }));
      
      setCases(transformedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoadingCases(false);
    }
  }, []);
  
  const refetchCases = useCallback(async () => {
    await fetchCases();
  }, [fetchCases]);
  
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);
  
  const addCase = async (data: { 
    title: string; 
    description: string; 
    status: string; 
    priority: string; 
    companyId: string; 
    categoryId: string 
  }) => {
    try {
      const { data: caseData, error } = await supabase
        .from('cases')
        .insert({
          title: data.title,
          description: data.description,
          status: data.status as CaseStatus,
          priority: data.priority as CasePriority,
          company_id: data.companyId,
          category_id: data.categoryId,
          user_id: currentUser?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newCase: Case = {
        id: caseData.id,
        createdAt: caseData.created_at,
        updatedAt: caseData.updated_at,
        title: caseData.title,
        description: caseData.description,
        status: caseData.status,
        priority: caseData.priority,
        companyId: caseData.company_id,
        userId: caseData.user_id,
        categoryId: caseData.category_id,
        assignedToId: caseData.assigned_to_id
      };
      
      setCases(prev => [...prev, newCase]);
      return newCase;
    } catch (error) {
      console.error('Error adding case:', error);
      throw error;
    }
  };
  
  const updateCase = async (caseId: string, updates: Partial<Case>) => {
    try {
      // Transform frontend Case interface to database schema
      const dbUpdates: any = {};
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.priority) dbUpdates.priority = updates.priority;
      if (updates.companyId) dbUpdates.company_id = updates.companyId;
      if (updates.userId) dbUpdates.user_id = updates.userId;
      if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
      if (updates.assignedToId) dbUpdates.assigned_to_id = updates.assignedToId;
      
      const { error } = await supabase
        .from('cases')
        .update(dbUpdates)
        .eq('id', caseId);
      
      if (error) throw error;
      
      setCases(prev => 
        prev.map(c => (c.id === caseId ? {...c, ...updates} : c))
      );
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  };

  // Case replies
  const fetchReplies = useCallback(async (caseId: string) => {
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from('replies')
        .select('*, attachments(*)')
        .eq('case_id', caseId);
      
      if (error) throw error;
      
      const formattedReplies = data.map(reply => ({
        id: reply.id,
        caseId: reply.case_id,
        userId: reply.user_id,
        content: reply.content,
        isInternal: reply.is_internal,
        createdAt: reply.created_at,
        attachments: reply.attachments
      }));
      
      setRepliesData(formattedReplies);
      return formattedReplies;
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  const refetchReplies = useCallback(async (caseId: string) => {
    await fetchReplies(caseId);
  }, [fetchReplies]);

  // Add a reply with optional attachments
  const addReply = async (data: { caseId: string; userId: string; content: string; isInternal: boolean; attachments?: File[] }) => {
    try {
      // First, create the reply
      const { data: replyData, error } = await supabase
        .from('replies')
        .insert({
          case_id: data.caseId,
          user_id: data.userId,
          content: data.content,
          is_internal: data.isInternal
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newReply: Reply = {
        id: replyData.id,
        caseId: replyData.case_id,
        userId: replyData.user_id,
        content: replyData.content,
        isInternal: replyData.is_internal,
        createdAt: replyData.created_at,
        attachments: []
      };
      
      // If there are files, upload them
      if (data.attachments && data.attachments.length > 0) {
        const attachments: ReplyAttachment[] = [];
        
        for (const file of data.attachments) {
          try {
            // Use the uploadAttachment utility
            const attachmentData = await uploadAttachment(file, data.caseId, newReply.id);
            
            if (attachmentData) {
              // Store attachment metadata
              const { data: attachmentRecord } = await supabase
                .from('attachments')
                .insert({
                  reply_id: newReply.id,
                  name: attachmentData.name,
                  path: attachmentData.path,
                  size: attachmentData.size,
                  type: attachmentData.type
                })
                .select()
                .single();
              
              if (attachmentRecord) {
                attachments.push({
                  path: attachmentRecord.path,
                  name: attachmentRecord.name,
                  size: attachmentRecord.size,
                  type: attachmentRecord.type
                });
              }
            }
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            // Continue with other files even if one fails
          }
        }
        
        if (attachments.length > 0) {
          newReply.attachments = attachments;
        }
      }
      
      // Update state with the new reply
      setRepliesData(prev => [...prev, newReply]);
      
      return newReply;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('replies')
        .delete()
        .eq('id', replyId);
      
      if (error) throw error;
      
      setRepliesData(prev => prev.filter(reply => reply.id !== replyId));
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  };

  // Case notes
  const fetchNotes = useCallback(async (caseId: string) => {
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('case_id', caseId);
      
      if (error) throw error;
      
      setNotesData(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const refetchNotes = useCallback(async (caseId: string) => {
    await fetchNotes(caseId);
  }, [fetchNotes]);
  
  const addNote = async (data: { caseId: string; userId: string; content: string }) => {
    try {
      const { data: noteData, error } = await supabase
        .from('notes')
        .insert({
          case_id: data.caseId,
          user_id: data.userId,
          content: data.content
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newNote: Note = {
        id: noteData.id,
        caseId: noteData.case_id,
        userId: noteData.user_id,
        content: noteData.content,
        createdAt: noteData.created_at
      };
      
      setNotesData(prev => [...prev, newNote]);
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        companies,
        categories,
        cases,
        replies,
        notes,
        language,
        setLanguage,
        loadingUsers,
        loadingCompanies,
        loadingCategories,
        loadingCases,
        loadingReplies,
        loadingNotes,
        fetchUsers,
        fetchCompanies,
        fetchCategories,
        fetchCases,
        refetchCases,
        fetchReplies,
        refetchReplies,
        fetchNotes,
        refetchNotes,
        addCompany,
        addCategory,
        addCase,
        updateCase,
        addReply,
        deleteReply,
        addNote,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
