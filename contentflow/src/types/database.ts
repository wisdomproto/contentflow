// ContentFlow Database Types — PRD v2.0 기반
import type { FunnelConfig, GA4Config, ImportedStrategy } from './analytics';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ContentStatus = 'draft' | 'in_progress' | 'published';
export type ChannelType = 'blog' | 'instagram' | 'threads' | 'youtube';
export type CardType = 'text' | 'image' | 'divider' | 'quote' | 'list';
export type AssetType = 'image' | 'audio' | 'video';
export type FactcheckStatus = 'unchecked' | 'checking' | 'checked';
export type ReferenceType = 'pdf' | 'docx' | 'md' | 'txt' | 'hwp' | 'youtube' | 'url';
export type VideoDuration = 'short' | 'mid' | 'long';
export type ThreadType = 'single' | 'multi';
export type InstagramContentType = 'carousel' | 'video' | 'single';
export type PublishStatus = 'pending' | 'uploading' | 'success' | 'failed';
export type ApiProvider =
  | 'gemini'
  | 'instagram'
  | 'threads'
  | 'youtube'
  | 'naver'
  | 'perplexity'
  | 'meta_pixel'
  | 'ga4';
export type GuideType = 'global' | 'blog' | 'instagram' | 'threads' | 'youtube';

export interface ReferenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string | null;
  r2_key: string | null;
  extracted_text: string | null;
  added_at: string;
}

export interface BgmFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration: number | null;
  url: string | null;
  r2_key: string | null;
  added_at: string;
}

// --- API Keys ---

export interface ProjectApiKeys {
  naver?: {
    licenseKey: string;
    secretKey: string;
    customerId: string;
  };
  naverDatalab?: {
    clientId: string;
    clientSecret: string;
  };
  instagram?: {
    appId: string;
    appSecret: string;
    accessToken: string;
  };
  threads?: {
    appId: string;
    appSecret: string;
    accessToken: string;
  };
  youtube?: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  perplexity?: {
    apiKey: string;
  };
}

// --- Core Tables ---

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  theme_preference: ThemePreference;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  industry: string | null;
  brand_name: string | null;
  brand_description: string | null;
  target_audience: Record<string, unknown> | null;
  usp: string | null;
  brand_tone: string | null;
  banned_keywords: string[] | null;
  brand_logo_url: string | null;
  marketer_name: string | null;
  marketer_expertise: string | null;
  marketer_style: string | null;
  marketer_phrases: string[] | null;
  sns_goal: string | null;
  // 채널별 프롬프트
  blog_tone_prompt: string | null;
  blog_image_style_prompt: string | null;
  instagram_tone_prompt: string | null;
  instagram_image_style_prompt: string | null;
  threads_tone_prompt: string | null;
  youtube_tone_prompt: string | null;
  youtube_image_style_prompt: string | null;
  ai_model_settings: Record<string, unknown> | null;
  // 글쓰기 가이드 (텍스트 우선, 전체 > 채널별)
  writing_guide_global: string | null;
  writing_guide_blog: string | null;
  writing_guide_instagram: string | null;
  writing_guide_threads: string | null;
  writing_guide_youtube: string | null;
  // API 키 (채널별)
  api_keys: ProjectApiKeys | null;
  // 참고 자료 (프로젝트 기본)
  reference_files: ReferenceFile[] | null;
  bgm_files: BgmFile[] | null;
  // 참고 자료 AI 분석 요약
  reference_summary: string | null;
  // 퍼널 & 분석 설정
  funnel_config: FunnelConfig | null;
  ga4_config: GA4Config | null;
  // 임포트된 마케팅 전략
  imported_strategy: ImportedStrategy | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  category: string | null;
  tags: string[] | null;
  memo: string | null;
  topic: string | null;
  status: ContentStatus;
  ai_model_settings: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReferenceMaterial {
  id: string;
  content_id: string;
  type: ReferenceType;
  source_url: string | null;
  file_url: string | null;
  file_name: string | null;
  extracted_text: string | null;
  summary: string | null;
  created_at: string;
}

export interface BaseArticle {
  id: string;
  content_id: string;
  title: string | null;
  body: string;
  body_plain_text: string | null;
  word_count: number;
  factcheck_status: FactcheckStatus | null;
  factcheck_score: number | null;
  factcheck_report: Record<string, unknown> | null;
  prompt_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogContent {
  id: string;
  content_id: string;
  title?: string;
  seo_title: string | null;
  seo_score: number | null;
  seo_details: Record<string, unknown> | null;
  naver_keywords: Record<string, unknown> | null;
  status: ContentStatus;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogCard {
  id: string;
  blog_content_id: string;
  card_type: CardType;
  content: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramContent {
  id: string;
  content_id: string;
  title?: string;
  caption: string | null;
  hashtags: string[] | null;
  content_type: InstagramContentType;
  video_settings: Record<string, unknown> | null;
  status: ContentStatus;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramCard {
  id: string;
  instagram_content_id: string;
  text_content: string | null;
  background_color: string | null;
  background_image_url: string | null;
  text_style: Record<string, unknown> | null;
  image_prompt?: string | null;
  reference_image_url?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ThreadsContent {
  id: string;
  content_id: string;
  title?: string;
  thread_type: ThreadType;
  status: ContentStatus;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadsCard {
  id: string;
  threads_content_id: string;
  text_content: string;
  media_url: string | null;
  media_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface YoutubeContent {
  id: string;
  content_id: string;
  title?: string;
  video_title: string | null;
  video_description: string | null;
  video_tags: string[] | null;
  video_category: string | null;
  target_duration: VideoDuration | null;
  thumbnail_url: string | null;
  video_url: string | null;
  status: ContentStatus;
  youtube_video_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YoutubeCard {
  id: string;
  youtube_content_id: string;
  section_type: string | null;
  narration_text: string | null;
  screen_direction: string | null;
  subtitle_text: string | null;
  image_url: string | null;
  image_prompt: string | null;
  video_prompt: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  parent_type: string;
  parent_id: string;
  asset_type: AssetType;
  file_url: string;
  prompt: string | null;
  generation_params: Record<string, unknown> | null;
  version: number;
  is_current: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  project_id: string;
  provider: ApiProvider;
  encrypted_key: string;
  metadata: Record<string, unknown> | null;
  is_connected: boolean;
  updated_at: string;
}

export interface WritingGuide {
  id: string;
  user_id: string;
  project_id: string;
  type: GuideType;
  file_url: string;
  file_name: string | null;
  extracted_text: string | null;
  uploaded_at: string;
}
