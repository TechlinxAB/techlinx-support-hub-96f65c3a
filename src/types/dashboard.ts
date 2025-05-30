
export type BlockType = 'heading' | 'text' | 'card' | 'faq' | 'links' | 'dropdown' | 'image' | 'table';

export interface DashboardBlock {
  id: string;
  companyId: string;
  title: string;
  content: any;
  type: BlockType;
  position: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  showTitle?: boolean; // We keep this for TypeScript type safety but store in content
}

export interface HeadingBlockContent {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  showTitle?: boolean;
}

export interface TextBlockContent {
  text: string;
  showTitle?: boolean;
}

export interface CardBlockContent {
  title: string;
  content: string;
  icon?: string;
  action?: {
    label: string;
    link: string;
  };
  showTitle?: boolean;
}

export interface FAQBlockContent {
  items: {
    question: string;
    answer: string;
  }[];
  showTitle?: boolean;
}

export interface LinkBlockContent {
  links: {
    label: string;
    url: string;
    icon?: string;
  }[];
  showTitle?: boolean;
}

export interface DropdownBlockContent {
  title: string;
  items: {
    label: string;
    content: string;
  }[];
  showTitle?: boolean;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
  width?: string | number; // Can be percentage (e.g., "100%") or pixels
  height?: string | number; // Optional, can maintain aspect ratio if not specified
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'; // CSS object-fit property
  objectPosition?: string; // CSS object-position property (e.g., "center", "top left")
  showTitle?: boolean;
}

export interface TableBlockContent {
  headers: string[];
  rows: {
    id: string;
    cells: string[];
    link?: string;
  }[];
  isInteractive?: boolean;
  sortable?: boolean;
  variant?: 'default' | 'compact' | 'striped';
  showTitle?: boolean;
}
