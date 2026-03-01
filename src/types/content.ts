export type ContentStatus = 'draft' | 'generated' | 'published' | 'needs_edit';
export type SectionType = 'intro' | 'body' | 'qa' | 'summary';
export type TabId = 'basic' | 'blog' | 'cardnews' | 'video';
export type GeminiModel = 'flash' | 'pro' | 'flash-3' | 'pro-31';
export type ImageModel = 'flash-image' | 'pro-image' | 'flash-31-image';

export interface ModelSettings {
  blog: GeminiModel;
  cardnews: GeminiModel;
  video: GeminiModel;
}

export interface BlogSection {
  id: string;
  type: SectionType;
  header: string;
  imageUrl: string | null;
  imagePlaceholder: string;
  text: string;
  isCollapsed: boolean;
  question?: string;
  answer?: string;
  points?: string[];
}

export interface Source {
  topic: string;
  keywords: string[];
  tone: string;
  insights: string;
  referenceUrls: string[];
}

export interface BlogData {
  title: string;
  sections: BlogSection[];
  tags: string[];
}

import type { CardNewsData } from './card-news';

export interface ContentContext {
  id: string;
  folderId: string | null;
  status: ContentStatus;
  source: Source;
  blog: BlogData;
  cardnews: CardNewsData | null;
  video: null;
  modelSettings: ModelSettings;
  imageModel: ImageModel;
  createdAt: string;
  updatedAt: string;
}
