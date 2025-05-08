import React, { 
  createContext, 
  useState, 
  useEffect, 
  useContext, 
  useCallback 
} from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  role: 'user' | 'consultant';
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

export interface Case {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  status: 'new' | 'ongoing' | 'resolved' | 'completed' | 'draft';
  priority: 'low' | 'medium' | 'high';
  companyId: string;
  userId: string;
  categoryId: string;
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
        .from('users')
        .select('*');
      
      if (error) throw error;
      
      setUsers(data);
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
      
      setCompanies(data);
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
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      const newCompany: Company = {
        id: companyData.id,
        createdAt: companyData.created_at,
        name: companyData.name,
        description: companyData.description
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
      
      setCategories(data);
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
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      const newCategory: Category = {
        id: categoryData.id,
        createdAt: categoryData.created_at,
        name: categoryData.name,
        description: categoryData.description
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
      
      setCases(data);
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
        .insert(data)
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
        categoryId: caseData.category_id
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
      const { error } = await supabase
        .from('cases')
        .update(updates)
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
            // Upload the file
            const { data: uploadData } = await supabase
              .storage
              .from('case-attachments')
              .upload(`${data.caseId}/${newReply.id}/${file.name}`, file);
            
            if (uploadData) {
              // Store attachment metadata
              const { data: attachmentData } = await supabase
                .from('attachments')
                .insert({
                  reply_id: newReply.id,
                  name: file.name,
                  path: uploadData.path,
                  size: file.size,
                  type: file.type
                })
                .select()
                .single();
              
              if (attachmentData) {
                attachments.push({
                  path: attachmentData.path,
                  name: attachmentData.name,
                  size: attachmentData.size,
                  type: attachmentData.type
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
        .insert(data)
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
