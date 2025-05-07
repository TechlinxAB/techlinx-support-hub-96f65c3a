
export type NewsBlockType = 'heading' | 'text' | 'image' | 'quote' | 'list';

export interface NewsBlock {
  id: string;
  companyId: string;
  title: string;
  content: any;
  type: NewsBlockType;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface HeadingBlockContent {
  level: 1 | 2 | 3;
  text: string;
}

export interface TextBlockContent {
  text: string;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
}

export interface QuoteBlockContent {
  quote: string;
  author?: string;
}

export interface ListBlockContent {
  items: string[];
  ordered: boolean;
}

export interface NewsArticle {
  id: string;
  companyId: string;
  title: string;
  summary: string;
  publishDate: Date;
  isPublished: boolean;
  blocks: NewsBlock[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
