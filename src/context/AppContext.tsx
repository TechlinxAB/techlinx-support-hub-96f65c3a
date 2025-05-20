
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserProfile } from './AuthContext';
import { BlockType } from '@/types/dashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define missing types
export type CaseStatus = 'new' | 'ongoing' | 'resolved' | 'completed' | 'draft';
export type CasePriority = 'low' | 'medium' | 'high';

// Define Case type
export type Case = {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  userId: string;
  companyId: string;
  categoryId: string;
  assignedToId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Define Company type
export type Company = {
  id: string;
  name: string;
  logo?: string;
  createdAt: Date;
};

// Define Category type
export type Category = {
  id: string;
  name: string;
  createdAt: Date;
};

// Define User type (for user management)
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;         // Add phone field
  companyId?: string;     // Add companyId field
  preferredLanguage?: string; // Add preferredLanguage field
};

// Define Reply type
export interface Reply {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  userRole?: string; // Add userRole as an optional property
}

// Define Note type
export type Note = {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: Date;
};

// Define Attachment type
export type Attachment = {
  id: string;
  caseId: string;
  replyId?: string;
  fileName: string;
  filePath: string;
  contentType?: string;
  size?: number;
  createdBy: string;
  createdAt: Date;
};

// Define Dashboard Block type
export type DashboardBlock = {
  id: string;
  companyId: string;
  title: string;
  type: BlockType;  // Use BlockType from types/dashboard
  content: any;
  position: number;
  parentId?: string;
  showTitle?: boolean; // Add showTitle property
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

// Add UserRole and Language types
export type UserRole = 'admin' | 'user' | 'consultant';
export type Language = 'en' | 'sv';

// Type definitions for the AppContext
type AppContextType = {
  // Basic app settings
  language: Language;
  setLanguage: (language: Language) => void;
  currentUser: UserProfile | null;
  
  // Cases
  cases: Case[];
  loadingCases: boolean;
  refetchCases: (caseId?: string) => Promise<Case[]>;
  updateCase: (caseId: string, data: Partial<Case>) => Promise<Case | null>;
  addCase: (data: Partial<Case>) => Promise<Case | null>;
  
  // Companies
  companies: Company[];
  addCompany: (data: Partial<Company>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<Company | null>;
  deleteCompany: (companyId: string) => Promise<boolean>;
  refetchCompanies: () => Promise<Company[]>;
  
  // Users
  users: User[];
  refetchUsers: () => Promise<User[]>;
  
  // Categories
  categories: Category[];
  refetchCategories: () => Promise<Category[]>;
  
  // Replies and Notes
  replies: Reply[];
  notes: Note[];
  loadingReplies: boolean;
  loadingNotes: boolean;
  refetchReplies: (caseId: string) => Promise<Reply[]>;
  refetchNotes: (caseId: string) => Promise<Note[]>;
  addReply: (data: Partial<Reply>) => Promise<Reply | null>;
  addNote: (data: Partial<Note>) => Promise<Note | null>;
  deleteReply: (id: string) => Promise<boolean>;
  
  // Attachments
  caseAttachments: Attachment[];
  loadingAttachments: boolean;
  refetchAttachments: (caseId: string) => Promise<Attachment[]>;
  uploadAttachment: (data: Partial<Attachment>) => Promise<Attachment | null>;
  
  // Dashboard blocks
  dashboardBlocks: DashboardBlock[];
  loadingDashboardBlocks: boolean;
  refetchDashboardBlocks: (companyId: string) => Promise<DashboardBlock[]>;
  addDashboardBlock: (data: Partial<DashboardBlock>) => Promise<DashboardBlock | null>;
  updateDashboardBlock: (id: string, data: Partial<DashboardBlock>) => Promise<DashboardBlock | null>;
  deleteDashboardBlock: (id: string) => Promise<boolean>;
  
  // Company News blocks
  addCompanyNewsBlock: (data: any) => Promise<any>;
  updateCompanyNewsBlock: (id: string, data: any) => Promise<any>;
  deleteCompanyNewsBlock: (id: string) => Promise<boolean>;
  publishCompanyNewsBlock: (id: string) => Promise<boolean>;
};

// Create the context with default values
const AppContext = createContext<AppContextType>({
  language: 'en',
  setLanguage: () => {},
  currentUser: null,
  cases: [],
  loadingCases: false,
  refetchCases: async () => [],
  updateCase: async () => null,
  addCase: async () => null,
  companies: [],
  addCompany: async () => null,
  updateCompany: async () => null,
  deleteCompany: async () => false,
  refetchCompanies: async () => [],
  users: [],
  refetchUsers: async () => [],
  categories: [],
  refetchCategories: async () => [],
  replies: [],
  notes: [],
  loadingReplies: false,
  loadingNotes: false,
  refetchReplies: async () => [],
  refetchNotes: async () => [],
  addReply: async () => null,
  addNote: async () => null,
  deleteReply: async () => false,
  caseAttachments: [],
  loadingAttachments: false,
  refetchAttachments: async () => [],
  uploadAttachment: async () => null,
  dashboardBlocks: [],
  loadingDashboardBlocks: false,
  refetchDashboardBlocks: async () => [],
  addDashboardBlock: async () => null,
  updateDashboardBlock: async () => null,
  deleteDashboardBlock: async () => false,
  addCompanyNewsBlock: async (data: any) => null,
  updateCompanyNewsBlock: async (id: string, data: any) => null,
  deleteCompanyNewsBlock: async (id: string) => false,
  publishCompanyNewsBlock: async (id: string) => false,
});

// Provider component to wrap the app
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingReplies, setLoadingReplies] = useState<boolean>(false);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [caseAttachments, setCaseAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState<boolean>(false);
  const [dashboardBlocks, setDashboardBlocks] = useState<DashboardBlock[]>([]);
  const [loadingDashboardBlocks, setLoadingDashboardBlocks] = useState<boolean>(false);
  
  // Get auth data SAFELY by accessing it only after loading is complete
  const { user, profile, loading } = useAuth();

  // Implementation for refetching cases
  const refetchCases = async (caseId?: string): Promise<Case[]> => {
    setLoadingCases(true);
    try {
      let query = supabase
        .from('cases')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (caseId) {
        query = query.eq('id', caseId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching cases:", error);
        toast.error("Failed to load cases");
        return cases;
      }
      
      if (data) {
        const formattedCases = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          status: item.status as CaseStatus,
          priority: item.priority as CasePriority,
          userId: item.user_id,
          companyId: item.company_id,
          categoryId: item.category_id,
          assignedToId: item.assigned_to_id,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }));
        
        setCases(formattedCases);
        return formattedCases;
      }
      
      return cases;
    } catch (error) {
      console.error("Error in refetchCases:", error);
      toast.error("Failed to load cases");
      return cases;
    } finally {
      setLoadingCases(false);
    }
  };
  
  // Implementation for updating a case
  const updateCase = async (caseId: string, data: Partial<Case>): Promise<Case | null> => {
    try {
      // Convert from camelCase to snake_case for Supabase
      const supabaseData: any = {};
      if (data.title) supabaseData.title = data.title;
      if (data.description) supabaseData.description = data.description;
      if (data.status) supabaseData.status = data.status;
      if (data.priority) supabaseData.priority = data.priority;
      if (data.userId) supabaseData.user_id = data.userId;
      if (data.companyId) supabaseData.company_id = data.companyId;
      if (data.categoryId) supabaseData.category_id = data.categoryId;
      if (data.assignedToId) supabaseData.assigned_to_id = data.assignedToId;
      
      supabaseData.updated_at = new Date().toISOString();
      
      const { data: responseData, error } = await supabase
        .from('cases')
        .update(supabaseData)
        .eq('id', caseId)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating case:", error);
        toast.error("Failed to update case");
        return null;
      }
      
      if (responseData) {
        await refetchCases();
        
        return {
          id: responseData.id,
          title: responseData.title,
          description: responseData.description,
          status: responseData.status as CaseStatus,
          priority: responseData.priority as CasePriority,
          userId: responseData.user_id,
          companyId: responseData.company_id,
          categoryId: responseData.category_id,
          assignedToId: responseData.assigned_to_id,
          createdAt: new Date(responseData.created_at),
          updatedAt: new Date(responseData.updated_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in updateCase:", error);
      toast.error("Failed to update case");
      return null;
    }
  };
  
  // Implementation for adding a company
  const addCompany = async (data: Partial<Company>): Promise<Company | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          logo: data.logo
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating company:", error);
        toast.error("Failed to create company");
        return null;
      }
      
      if (responseData) {
        await refetchCompanies();
        return {
          id: responseData.id,
          name: responseData.name,
          logo: responseData.logo,
          createdAt: new Date(responseData.created_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in addCompany:", error);
      toast.error("Failed to create company");
      return null;
    }
  };
  
  // Implementation for updating a company
  const updateCompany = async (id: string, data: Partial<Company>): Promise<Company | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('companies')
        .update({
          name: data.name,
          logo: data.logo
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating company:", error);
        toast.error("Failed to update company");
        return null;
      }
      
      if (responseData) {
        await refetchCompanies();
        return {
          id: responseData.id,
          name: responseData.name,
          logo: responseData.logo,
          createdAt: new Date(responseData.created_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in updateCompany:", error);
      toast.error("Failed to update company");
      return null;
    }
  };
  
  // Implementation for deleting a company
  const deleteCompany = async (companyId: string) => {
    try {
      // First try to delete any related data that doesn't have cascading deletes
      // You may need to implement a more comprehensive deletion approach
      // in a production environment

      // Then delete the company
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        console.error('Error deleting company:', error);
        
        // Handle foreign key constraint error
        if (error.code === '23503') {
          throw new Error(
            'This company has dependent records. Please delete all related data first.'
          );
        }
        
        throw error;
      }

      // Update local state
      setCompanies(prevCompanies => 
        prevCompanies.filter(company => company.id !== companyId)
      );

      return true;
    } catch (error) {
      console.error('Error in deleteCompany:', error);
      throw error;
    }
  };
  
  // Implementation for fetching all companies
  const refetchCompanies = async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Error fetching companies:", error);
        toast.error("Failed to load companies");
        return companies;
      }
      
      if (data) {
        const formattedCompanies = data.map(item => ({
          id: item.id,
          name: item.name,
          logo: item.logo,
          createdAt: new Date(item.created_at)
        }));
        
        setCompanies(formattedCompanies);
        return formattedCompanies;
      }
      
      return companies;
    } catch (error) {
      console.error("Error in refetchCompanies:", error);
      toast.error("Failed to load companies");
      return companies;
    }
  };
  
  // Implementation for refetching replies
  const refetchReplies = async (caseId: string): Promise<Reply[]> => {
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from('replies')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at');
      
      if (error) {
        console.error("Error fetching replies:", error);
        return replies;
      }
      
      if (data) {
        const formattedReplies = data.map(item => ({
          id: item.id,
          caseId: item.case_id,
          userId: item.user_id,
          content: item.content,
          isInternal: item.is_internal,
          createdAt: new Date(item.created_at).toISOString() // Convert to string to match interface
        }));
        
        setReplies(formattedReplies);
        return formattedReplies;
      }
      
      return replies;
    } catch (error) {
      console.error("Error in refetchReplies:", error);
      return replies;
    } finally {
      setLoadingReplies(false);
    }
  };
  
  // Implementation for refetching notes
  const refetchNotes = async (caseId: string): Promise<Note[]> => {
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at');
      
      if (error) {
        console.error("Error fetching notes:", error);
        return notes;
      }
      
      if (data) {
        const formattedNotes = data.map(item => ({
          id: item.id,
          caseId: item.case_id,
          userId: item.user_id,
          content: item.content,
          createdAt: new Date(item.created_at)
        }));
        
        setNotes(formattedNotes);
        return formattedNotes;
      }
      
      return notes;
    } catch (error) {
      console.error("Error in refetchNotes:", error);
      return notes;
    } finally {
      setLoadingNotes(false);
    }
  };
  
  // Implementation for adding a reply
  const addReply = async (data: Partial<Reply>): Promise<Reply | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('replies')
        .insert({
          case_id: data.caseId,
          user_id: data.userId,
          content: data.content,
          is_internal: data.isInternal
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error adding reply:", error);
        toast.error("Failed to add reply");
        return null;
      }
      
      if (responseData && data.caseId) {
        await refetchReplies(data.caseId);
        
        return {
          id: responseData.id,
          caseId: responseData.case_id,
          userId: responseData.user_id,
          content: responseData.content,
          isInternal: responseData.is_internal,
          createdAt: new Date(responseData.created_at).toISOString() // Convert to string to match interface
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in addReply:", error);
      toast.error("Failed to add reply");
      return null;
    }
  };
  
  // Implementation for adding a note
  const addNote = async (data: Partial<Note>): Promise<Note | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('notes')
        .insert({
          case_id: data.caseId,
          user_id: data.userId,
          content: data.content
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error adding note:", error);
        toast.error("Failed to add note");
        return null;
      }
      
      if (responseData && data.caseId) {
        await refetchNotes(data.caseId);
        
        return {
          id: responseData.id,
          caseId: responseData.case_id,
          userId: responseData.user_id,
          content: responseData.content,
          createdAt: new Date(responseData.created_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in addNote:", error);
      toast.error("Failed to add note");
      return null;
    }
  };
  
  // Implementation for deleting a reply
  const deleteReply = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('replies')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Error deleting reply:", error);
        toast.error("Failed to delete reply");
        return false;
      }
      
      // Update the state by filtering out the deleted reply
      setReplies(prev => prev.filter(reply => reply.id !== id));
      return true;
    } catch (error) {
      console.error("Error in deleteReply:", error);
      toast.error("Failed to delete reply");
      return false;
    }
  };
  
  // Implementation for fetching attachments
  const refetchAttachments = async (caseId: string): Promise<Attachment[]> => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('case_attachments')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at');
      
      if (error) {
        console.error("Error fetching attachments:", error);
        return caseAttachments;
      }
      
      if (data) {
        const formattedAttachments = data.map(item => ({
          id: item.id,
          caseId: item.case_id,
          replyId: item.reply_id,
          fileName: item.file_name,
          filePath: item.file_path,
          contentType: item.content_type,
          size: item.size,
          createdBy: item.created_by,
          createdAt: new Date(item.created_at)
        }));
        
        setCaseAttachments(formattedAttachments);
        return formattedAttachments;
      }
      
      return caseAttachments;
    } catch (error) {
      console.error("Error in refetchAttachments:", error);
      return caseAttachments;
    } finally {
      setLoadingAttachments(false);
    }
  };
  
  // Implementation for adding an attachment
  const uploadAttachment = async (data: Partial<Attachment>): Promise<Attachment | null> => {
    // This would involve both storage and database operations
    // For now, we'll return null as this would need a more complex implementation
    return null;
  };
  
  // Implementation for fetching dashboard blocks
  const refetchDashboardBlocks = async (companyId: string): Promise<DashboardBlock[]> => {
    setLoadingDashboardBlocks(true);
    try {
      const { data, error } = await supabase
        .from('dashboard_blocks')
        .select('*')
        .eq('company_id', companyId)
        .order('position');
      
      if (error) {
        console.error("Error fetching dashboard blocks:", error);
        return dashboardBlocks;
      }
      
      if (data) {
        const formattedBlocks = data.map(item => ({
          id: item.id,
          companyId: item.company_id,
          title: item.title,
          type: item.type as BlockType,
          content: item.content,
          position: item.position,
          parentId: item.parent_id,
          showTitle: true, // Default value
          createdBy: item.created_by,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }));
        
        setDashboardBlocks(formattedBlocks);
        return formattedBlocks;
      }
      
      return dashboardBlocks;
    } catch (error) {
      console.error("Error in refetchDashboardBlocks:", error);
      return dashboardBlocks;
    } finally {
      setLoadingDashboardBlocks(false);
    }
  };
  
  // Implementation for adding a dashboard block
  const addDashboardBlock = async (data: Partial<DashboardBlock>): Promise<DashboardBlock | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('dashboard_blocks')
        .insert({
          company_id: data.companyId,
          title: data.title,
          type: data.type,
          content: data.content,
          position: data.position,
          parent_id: data.parentId,
          created_by: data.createdBy
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error adding dashboard block:", error);
        toast.error("Failed to add dashboard block");
        return null;
      }
      
      if (responseData && data.companyId) {
        await refetchDashboardBlocks(data.companyId);
        
        return {
          id: responseData.id,
          companyId: responseData.company_id,
          title: responseData.title,
          type: responseData.type as BlockType,
          content: responseData.content,
          position: responseData.position,
          parentId: responseData.parent_id,
          showTitle: true, // Default value
          createdBy: responseData.created_by,
          createdAt: new Date(responseData.created_at),
          updatedAt: new Date(responseData.updated_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in addDashboardBlock:", error);
      toast.error("Failed to add dashboard block");
      return null;
    }
  };
  
  // Implementation for updating a dashboard block
  const updateDashboardBlock = async (id: string, data: Partial<DashboardBlock>): Promise<DashboardBlock | null> => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.parentId !== undefined) updateData.parent_id = data.parentId;
      
      const { data: responseData, error } = await supabase
        .from('dashboard_blocks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating dashboard block:", error);
        toast.error("Failed to update dashboard block");
        return null;
      }
      
      if (responseData && responseData.company_id) {
        await refetchDashboardBlocks(responseData.company_id);
        
        return {
          id: responseData.id,
          companyId: responseData.company_id,
          title: responseData.title,
          type: responseData.type as BlockType,
          content: responseData.content,
          position: responseData.position,
          parentId: responseData.parent_id,
          showTitle: true, // Default value
          createdBy: responseData.created_by,
          createdAt: new Date(responseData.created_at),
          updatedAt: new Date(responseData.updated_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in updateDashboardBlock:", error);
      toast.error("Failed to update dashboard block");
      return null;
    }
  };
  
  // Implementation for deleting a dashboard block
  const deleteDashboardBlock = async (id: string): Promise<boolean> => {
    try {
      // First, get the block to know which company to refetch after deletion
      const { data: blockData, error: fetchError } = await supabase
        .from('dashboard_blocks')
        .select('company_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error("Error fetching dashboard block before deletion:", fetchError);
        toast.error("Failed to delete dashboard block");
        return false;
      }
      
      const { error: deleteError } = await supabase
        .from('dashboard_blocks')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error("Error deleting dashboard block:", deleteError);
        toast.error("Failed to delete dashboard block");
        return false;
      }
      
      if (blockData) {
        await refetchDashboardBlocks(blockData.company_id);
      }
      
      return true;
    } catch (error) {
      console.error("Error in deleteDashboardBlock:", error);
      toast.error("Failed to delete dashboard block");
      return false;
    }
  };
  
  // Implementation for adding a case
  const addCase = async (data: Partial<Case>): Promise<Case | null> => {
    try {
      const { data: responseData, error } = await supabase
        .from('cases')
        .insert({
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          user_id: data.userId,
          company_id: data.companyId,
          category_id: data.categoryId,
          assigned_to_id: data.assignedToId
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating case:", error);
        toast.error("Failed to create case");
        return null;
      }
      
      if (responseData) {
        await refetchCases();
        
        return {
          id: responseData.id,
          title: responseData.title,
          description: responseData.description,
          status: responseData.status as CaseStatus,
          priority: responseData.priority as CasePriority,
          userId: responseData.user_id,
          companyId: responseData.company_id,
          categoryId: responseData.category_id,
          assignedToId: responseData.assigned_to_id,
          createdAt: new Date(responseData.created_at),
          updatedAt: new Date(responseData.updated_at)
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error in addCase:", error);
      toast.error("Failed to create case");
      return null;
    }
  };
  
  // Implementation for fetching users
  const refetchUsers = async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
        return users;
      }
      
      if (data) {
        const formattedUsers = data.map(item => ({
          id: item.id,
          name: item.name,
          email: item.email,
          role: item.role,
          phone: item.phone,
          companyId: item.company_id,
          preferredLanguage: item.preferred_language
        }));
        
        setUsers(formattedUsers);
        return formattedUsers;
      }
      
      return users;
    } catch (error) {
      console.error("Error in refetchUsers:", error);
      toast.error("Failed to load users");
      return users;
    }
  };
  
  // Implementation for refetching categories
  const refetchCategories = async (): Promise<Category[]> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
        return categories;
      }
      
      if (data) {
        const formattedCategories = data.map(item => ({
          id: item.id,
          name: item.name,
          createdAt: new Date(item.created_at)
        }));
        
        setCategories(formattedCategories);
        return formattedCategories;
      }
      
      return categories;
    } catch (error) {
      console.error("Error in refetchCategories:", error);
      toast.error("Failed to load categories");
      return categories;
    }
  };
  
  // Company News blocks - Placeholder implementations
  const addCompanyNewsBlock = async (data: any): Promise<any> => {
    try {
      const { data: responseData, error } = await supabase
        .from('company_news_blocks')
        .insert({
          company_id: data.companyId,
          title: data.title,
          type: data.type,
          content: data.content,
          position: data.position,
          parent_id: data.parentId,
          created_by: data.createdBy,
          is_published: data.isPublished || false
        })
        .select();
      
      if (error) {
        console.error("Error creating news block:", error);
        return null;
      }
      
      return responseData ? responseData[0] : null;
    } catch (error) {
      console.error("Error in addCompanyNewsBlock:", error);
      return null;
    }
  };
  
  const updateCompanyNewsBlock = async (id: string, data: any): Promise<any> => {
    try {
      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.isPublished !== undefined) updateData.is_published = data.isPublished;
      
      const { data: responseData, error } = await supabase
        .from('company_news_blocks')
        .update(updateData)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error("Error updating news block:", error);
        return null;
      }
      
      return responseData ? responseData[0] : null;
    } catch (error) {
      console.error("Error in updateCompanyNewsBlock:", error);
      return null;
    }
  };
  
  const deleteCompanyNewsBlock = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_news_blocks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Error deleting news block:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in deleteCompanyNewsBlock:", error);
      return false;
    }
  };
  
  const publishCompanyNewsBlock = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_news_blocks')
        .update({ is_published: true })
        .eq('id', id);
      
      if (error) {
        console.error("Error publishing news block:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in publishCompanyNewsBlock:", error);
      return false;
    }
  };

  // Load data when app initializes and user is authenticated
  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;

    // Now safe to use user/profile
    setCurrentUser(profile);
    
    // Load data from Supabase once authenticated
    const loadInitialData = async () => {
      try {
        // Load companies
        await refetchCompanies();
        
        // Load categories
        await refetchCategories();
        
        // Load users (profiles)
        await refetchUsers();
        
        // Load cases
        await refetchCases();
        
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Failed to load some app data");
      }
    };
    
    loadInitialData();
  }, [loading, user, profile]);

  // Fix context value definition to include all required properties
  const contextValue: AppContextType = {
    language,
    setLanguage,
    currentUser,
    cases,
    loadingCases,
    refetchCases,
    updateCase,
    addCase,
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    refetchCompanies,
    users,
    refetchUsers,
    categories,
    refetchCategories,
    replies,
    notes,
    loadingReplies,
    loadingNotes,
    refetchReplies,
    refetchNotes,
    addReply,
    addNote,
    deleteReply,
    caseAttachments,
    loadingAttachments,
    refetchAttachments,
    uploadAttachment,
    dashboardBlocks,
    loadingDashboardBlocks,
    refetchDashboardBlocks,
    addDashboardBlock,
    updateDashboardBlock,
    deleteDashboardBlock,
    addCompanyNewsBlock,
    updateCompanyNewsBlock,
    deleteCompanyNewsBlock,
    publishCompanyNewsBlock,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Custom hook to use the AppContext
export const useAppContext = () => {
  return useContext(AppContext);
};
