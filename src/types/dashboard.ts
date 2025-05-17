
export type BlockType = 'heading' | 'text' | 'card' | 'faq' | 'links' | 'dropdown' | 'image';

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
  showTitle?: boolean; // Add this property to control title visibility
}

export interface HeadingBlockContent {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface TextBlockContent {
  text: string;
}

export interface CardBlockContent {
  title: string;
  content: string;
  icon?: string;
  action?: {
    label: string;
    link: string;
  };
}

export interface FAQBlockContent {
  items: {
    question: string;
    answer: string;
  }[];
}

export interface LinkBlockContent {
  links: {
    label: string;
    url: string;
    icon?: string;
  }[];
}

export interface DropdownBlockContent {
  title: string;
  items: {
    label: string;
    content: string;
  }[];
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
}
