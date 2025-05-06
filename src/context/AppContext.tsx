
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define types
export type UserRole = 'user' | 'consultant';
export type CaseStatus = 'new' | 'ongoing' | 'resolved' | 'completed';
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
  attachments?: string[];
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

// Mock data
const mockCompanies: Company[] = [
  { id: '1', name: 'Acme Corp', logo: 'https://via.placeholder.com/150' },
  { id: '2', name: 'Swedish Tech', logo: 'https://via.placeholder.com/150' },
  { id: '3', name: 'Zenith Systems', logo: 'https://via.placeholder.com/150' },
];

const mockCategories: CaseCategory[] = [
  { id: '1', name: 'General' },
  { id: '2', name: 'Hardware' },
  { id: '3', name: 'Software' },
  { id: '4', name: 'Network' },
  { id: '5', name: 'Security' },
];

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@acme.com',
    companyId: '1',
    role: 'user',
    preferredLanguage: 'en',
  },
  {
    id: '2',
    name: 'Anna Svensson',
    email: 'anna@swedishtech.com',
    companyId: '2',
    role: 'user',
    preferredLanguage: 'sv',
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@techlinx.com',
    companyId: '1',
    role: 'consultant',
    preferredLanguage: 'en',
  },
];

const mockCases: Case[] = [
  {
    id: '1',
    title: 'Cannot access email',
    description: 'I am unable to log into my email account since this morning.',
    createdAt: new Date('2023-04-10T09:00:00'),
    updatedAt: new Date('2023-04-10T09:00:00'),
    status: 'new',
    priority: 'high',
    userId: '1',
    companyId: '1',
    categoryId: '1',
  },
  {
    id: '2',
    title: 'Need new keyboard',
    description: 'My keyboard has stopped working, need a replacement.',
    createdAt: new Date('2023-04-09T14:30:00'),
    updatedAt: new Date('2023-04-09T16:45:00'),
    status: 'ongoing',
    priority: 'medium',
    userId: '2',
    companyId: '2',
    categoryId: '2',
    assignedToId: '3',
  },
  {
    id: '3',
    title: 'Setup new VPN access',
    description: 'Need VPN access for new employee starting next week.',
    createdAt: new Date('2023-04-08T11:20:00'),
    updatedAt: new Date('2023-04-08T15:10:00'),
    status: 'completed',
    priority: 'low',
    userId: '1',
    companyId: '1',
    categoryId: '4',
    assignedToId: '3',
  },
  {
    id: '4',
    title: 'Software installation request',
    description: 'Need Adobe Creative Suite installed on my workstation.',
    createdAt: new Date('2023-04-07T10:15:00'),
    updatedAt: new Date('2023-04-07T13:20:00'),
    status: 'resolved',
    priority: 'medium',
    userId: '2',
    companyId: '2',
    categoryId: '3',
    assignedToId: '3',
  },
];

const mockReplies: Reply[] = [
  {
    id: '1',
    caseId: '2',
    userId: '3',
    content: 'We will order a new keyboard for you. What model do you prefer?',
    createdAt: new Date('2023-04-09T16:45:00'),
    isInternal: false,
  },
  {
    id: '2',
    caseId: '3',
    userId: '3',
    content: 'VPN access has been set up. Login details will be sent separately.',
    createdAt: new Date('2023-04-08T15:10:00'),
    isInternal: false,
  },
];

const mockNotes: Note[] = [
  {
    id: '1',
    caseId: '2',
    userId: '3',
    content: 'User seems to have spilled coffee on the keyboard. Order a spill-resistant one.',
    createdAt: new Date('2023-04-09T16:50:00'),
  },
];

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
  addCase: (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCase: (caseId: string, updates: Partial<Case>) => void;
  addReply: (reply: Omit<Reply, 'id' | 'createdAt'>) => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [casesData, setCasesData] = useState<Case[]>(mockCases);
  const [repliesData, setRepliesData] = useState<Reply[]>(mockReplies);
  const [notesData, setNotesData] = useState<Note[]>(mockNotes);
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers[2]); // Default to admin
  const [language, setLanguage] = useState<Language>('en');

  // Actions
  const addCase = (newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => {
    const caseToAdd: Case = {
      ...newCase,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCasesData((prev) => [...prev, caseToAdd]);
  };

  const updateCase = (caseId: string, updates: Partial<Case>) => {
    setCasesData((prev) =>
      prev.map((c) =>
        c.id === caseId ? { ...c, ...updates, updatedAt: new Date() } : c
      )
    );
  };

  const addReply = (reply: Omit<Reply, 'id' | 'createdAt'>) => {
    const replyToAdd: Reply = {
      ...reply,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setRepliesData((prev) => [...prev, replyToAdd]);
    
    // Update case last modified time
    updateCase(reply.caseId, {});
  };

  const addNote = (note: Omit<Note, 'id' | 'createdAt'>) => {
    const noteToAdd: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setNotesData((prev) => [...prev, noteToAdd]);
    
    // Update case last modified time
    updateCase(note.caseId, {});
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        users,
        cases: casesData,
        categories: mockCategories,
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
