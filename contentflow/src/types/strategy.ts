// src/types/strategy.ts
// AI 마케팅 전략 타입 정의

export type StrategyTab = 'overview' | 'keywords' | 'channelStrategy' | 'contentStrategy' | 'kpiAction';

export interface TabStatus {
  status: 'idle' | 'generating' | 'complete' | 'error';
  errorMessage?: string;
}

export interface GenerationStatus {
  overall: 'idle' | 'generating' | 'complete' | 'error';
  tabs: Record<StrategyTab, TabStatus>;
}

export interface StrategyInput {
  targetUrls: string[];
  businessInfo: {
    industry: string;
    services: string;
    targetCustomer: string;
    usp: string;
    channels: string[];
  };
  seedKeywords: string[];
  competitors: { name: string; url?: string }[];
  budget?: {
    monthlyRange: string;
    teamSize: number;
  };
}

// Tab ① Overview + Competitors
export interface DifferentiatorCard {
  label: string;
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

export interface IssueCard {
  severity: 'critical' | 'warning' | 'opportunity';
  title: string;
  description: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface CompetitorCard {
  name: string;
  type: string;
  strengths: string;
  weaknesses: string;
  strategy: string;
}

export interface OverviewData {
  summary: string;
  differentiators: DifferentiatorCard[];
  issues: IssueCard[];
  heroStats: HeroStat[];
  competitors: CompetitorCard[];
  positioning: string;
}

// Tab ② Keywords
export interface KeywordItem {
  keyword: string;
  totalSearch: number;
  pcSearch: number;
  mobileSearch: number;
  mobileRatio: number;
  competition: 'high' | 'medium' | 'low';
  plAvgDepth: number;
  pcClickCount: number;
  mobileClickCount: number;
  pcCtr: number;
  mobileCtr: number;
  category: string;
  isGolden: boolean;
}

export interface GoldenKeyword {
  keyword: string;
  totalSearch: number;
  competition: string;
  strategy: string;
  priority: number;
}

export interface KeywordInsight {
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

export interface KeywordTrend {
  keyword: string;
  monthly: { period: string; ratio: number }[];
}

export interface KeywordData {
  items: KeywordItem[];
  goldenKeywords: GoldenKeyword[];
  insights: KeywordInsight[];
  trends: KeywordTrend[];
  categories: string[];
}

// Tab ③ Channel + Funnel
export interface FunnelStep {
  icon: string;
  title: string;
  description: string;
}

export interface ChannelCard {
  channel: string;
  icon: string;
  frequency: string;
  bestTime: string;
  strategy: string;
  keywords: string[];
  adBudget?: string;
}

export interface ScheduleRow {
  channel: string;
  days: Record<string, string>;
  weeklyCount: string;
  time: string;
}

export interface RoleCard {
  role: string;
  title: string;
  tasks: string;
}

export interface ChannelStrategyData {
  funnel: FunnelStep[];
  funnelActions: string;
  homepageOptimization: string;
  channels: ChannelCard[];
  schedule: ScheduleRow[];
  roles: RoleCard[];
  globalStrategy?: string;
}

// Tab ④ Content + Topics
export interface ContentCategory {
  code: string;
  name: string;
  description: string;
  topicCount: number;
}

export interface TopicItem {
  id: string;
  category: string;
  title: string;
  angle: string;
  keywords: string[];
  targetChannels: string[];
  source: string;
  youtubeStatus?: 'new' | 'done' | 'similar';
  youtubeMatch?: string;
}

export interface ContentStrategyData {
  categories: ContentCategory[];
  cycleInfo: string;
  categoryRatios: string;
  topics: TopicItem[];
}

// Tab ⑤ KPI + Action
export interface ChannelKpi {
  channel: string;
  icon: string;
  metrics: string[];
  target: string;
}

export interface ActionItem {
  priority: 'now' | 'soon' | 'mid';
  action: string;
  description?: string;
  timeline: string;
  cost: string;
  assignee: string;
}

export interface KpiActionData {
  channelKpis: ChannelKpi[];
  integratedKpi: {
    metrics: string[];
    warning: string;
  };
  actions: ActionItem[];
  budgetSummary: string;
}

// Top-level
export interface MarketingStrategy {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  input: StrategyInput;
  overview: OverviewData | null;
  keywords: KeywordData | null;
  channelStrategy: ChannelStrategyData | null;
  contentStrategy: ContentStrategyData | null;
  kpiAction: KpiActionData | null;
  generationStatus: GenerationStatus;
}

// Crawl result
export interface CrawlResult {
  url: string;
  success: boolean;
  title?: string;
  description?: string;
  headings?: string[];
  bodyText?: string;
  error?: string;
}

// SSE event types
export type StrategySSEEvent =
  | { type: 'tab_start'; tab: StrategyTab }
  | { type: 'chunk'; tab: StrategyTab; content: string }
  | { type: 'tab_complete'; tab: StrategyTab; data: unknown }
  | { type: 'tab_error'; tab: StrategyTab; error: string }
  | { type: 'complete' };
