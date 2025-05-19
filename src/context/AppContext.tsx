
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserProfile } from './AuthContext';

// Define missing types
export type CaseStatus = 'new' | 'ongoing' | 'resolved' | 'completed';
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
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Define Company type
export type Company = {
  id: string;
  name: string;
  logo?: string;
  createdAt: string | Date;
};

// Define Category type
export type Category = {
  id: string;
  name: string;
  createdAt: string | Date;
};

// Define User type (for user management)
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Define Reply type
export type Reply = {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
  createdAt: string | Date;
};

// Define Note type
export type Note = {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  createdAt: string | Date;
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
  createdAt: string | Date;
};

// Define Dashboard Block type
export type DashboardBlock = {
  id: string;
  companyId: string;
  title: string;
  type: string;
  content: any;
  position: number;
  parentId?: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Type definitions for the AppContext
type AppContextType = {
  // Basic app settings
  language: 'en' | 'sv';
  setLanguage: (language: 'en' | 'sv') => void;
  currentUser: UserProfile | null;
  
  // Cases
  cases: Case[] | null;
  loadingCases: boolean;
  refetchCases: (caseId?: string) => Promise<Case[]>;
  updateCase: (caseId: string, data: Partial<Case>) => Promise<Case | null>;
  
  // Companies
  companies: Company[];
  addCompany: (data: Partial<Company>) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<Company | null>;
  deleteCompany: (id: string) => Promise<boolean>;
  refetchCompanies: () => Promise<Company[]>;
  
  // Users
  users: User[];
  
  // Categories
  categories: Category[];
  
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
};

// Create the context with default values
const AppContext = createContext<AppContextType>({
  language: 'en',
  setLanguage: () => {},
  currentUser: null,
  cases: null,
  loadingCases: false,
  refetchCases: async () => [],
  updateCase: async () => null,
  companies: [],
  addCompany: async () => null,
  updateCompany: async () => null,
  deleteCompany: async () => false,
  refetchCompanies: async () => [],
  users: [],
  categories: [],
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
});

// Provider component to wrap the app
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<'en' | 'sv'>('en');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<Case[] | null>(null);
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

  // Mock functions for refetching and updating data
  const refetchCases = async (caseId?: string): Promise<Case[]> => {
    // Mock implementation
    return cases || [];
  };
  
  const updateCase = async (caseId: string, data: Partial<Case>): Promise<Case | null> => {
    // Mock implementation
    return null;
  };
  
  const addCompany = async (data: Partial<Company>): Promise<Company | null> => {
    // Mock implementation
    return null;
  };
  
  const updateCompany = async (id: string, data: Partial<Company>): Promise<Company | null> => {
    // Mock implementation
    return null;
  };
  
  const deleteCompany = async (id: string): Promise<boolean> => {
    // Mock implementation
    return false;
  };
  
  const refetchCompanies = async (): Promise<Company[]> => {
    // Mock implementation
    return companies;
  };
  
  const refetchReplies = async (caseId: string): Promise<Reply[]> => {
    // Mock implementation
    return [];
  };
  
  const refetchNotes = async (caseId: string): Promise<Note[]> => {
    // Mock implementation
    return [];
  };
  
  const addReply = async (data: Partial<Reply>): Promise<Reply | null> => {
    // Mock implementation
    return null;
  };
  
  const addNote = async (data: Partial<Note>): Promise<Note | null> => {
    // Mock implementation
    return null;
  };
  
  const deleteReply = async (id: string): Promise<boolean> => {
    // Mock implementation
    return false;
  };
  
  const refetchAttachments = async (caseId: string): Promise<Attachment[]> => {
    // Mock implementation
    return [];
  };
  
  const uploadAttachment = async (data: Partial<Attachment>): Promise<Attachment | null> => {
    // Mock implementation
    return null;
  };
  
  const refetchDashboardBlocks = async (companyId: string): Promise<DashboardBlock[]> => {
    // Mock implementation
    return [];
  };
  
  const addDashboardBlock = async (data: Partial<DashboardBlock>): Promise<DashboardBlock | null> => {
    // Mock implementation
    return null;
  };
  
  const updateDashboardBlock = async (id: string, data: Partial<DashboardBlock>): Promise<DashboardBlock | null> => {
    // Mock implementation
    return null;
  };
  
  const deleteDashboardBlock = async (id: string): Promise<boolean> => {
    // Mock implementation
    return false;
  };

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;

    // Now safe to use user/profile
    setCurrentUser(profile);
    
    // Initialize some mock data for development
    // Initialize categories
    const mockCategories = [
      { id: 'cat1', name: 'IT Support', createdAt: new Date() },
      { id: 'cat2', name: 'HR', createdAt: new Date() },
      { id: 'cat3', name: 'Facilities', createdAt: new Date() }
    ];
    setCategories(mockCategories);
    
    // Initialize users
    const mockUsers = [
      { id: profile.id, name: profile.name || 'Current User', email: profile.email, role: profile.role },
      { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
      { id: 'user3', name: 'John Consultant', email: 'john@example.com', role: 'consultant' }
    ];
    setUsers(mockUsers);
    
    // Initialize companies
    const mockCompanies = [
      { id: 'comp1', name: 'Acme Inc', createdAt: new Date() },
      { id: 'comp2', name: 'Tech Solutions', createdAt: new Date() },
      { id: 'comp3', name: 'Global Corp', createdAt: new Date() }
    ];
    setCompanies(mockCompanies);
    
    // Simulate fetching cases
    const mockCases = [
      {
        id: '1',
        title: 'Cannot access email',
        description: 'User is unable to access their email account after password reset',
        status: 'ongoing' as CaseStatus,
        priority: 'high' as CasePriority,
        userId: profile.id,
        companyId: 'comp1',
        categoryId: 'cat1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Need software installation',
        description: 'Request for installation of design software on new laptop',
        status: 'new' as CaseStatus,
        priority: 'medium' as CasePriority,
        userId: profile.id,
        companyId: 'comp1',
        categoryId: 'cat1',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        id: '3',
        title: 'Password reset',
        description: 'User needs password reset for account system',
        status: 'resolved' as CaseStatus,
        priority: 'low' as CasePriority,
        userId: profile.id,
        companyId: 'comp2',
        categoryId: 'cat1',
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000),
      },
    ];
    
    setCases(mockCases);
  }, [loading, user, profile]);

  // Provide the context values
  const contextValue: AppContextType = {
    language,
    setLanguage,
    currentUser,
    cases,
    loadingCases,
    refetchCases,
    updateCase,
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    refetchCompanies,
    users,
    categories,
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
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Custom hook to use the AppContext
export const useAppContext = () => {
  return useContext(AppContext);
};
