
export type NewsBlockType = 'heading' | 'text' | 'card' | 'faq' | 'links' | 'dropdown' | 'image' | 'notice';

export interface CompanyNewsBlock {
  id: string;
  companyId: string;
  title: string;
  content: any;
  type: NewsBlockType;
  position: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublished: boolean;
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
  width?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  objectPosition?: string;
  aspectRatio?: string;
  customAspectRatioWidth?: string;
  customAspectRatioHeight?: string;
}

export interface NoticeBlockContent {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
}
