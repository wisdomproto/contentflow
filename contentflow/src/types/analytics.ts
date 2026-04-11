// src/types/analytics.ts

// --- 퍼널 설정 ---
export interface FunnelConfig {
  websiteUrl: string;
  conversionGoal: string;
  conversionUrl?: string;
  funnelSteps?: FunnelStep[];
}

export interface FunnelStep {
  name: string;
  url?: string;
  description?: string;
}

// --- GA4 설정 ---
export interface GA4Config {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

// --- GA4 응답 데이터 ---
export interface GA4OverviewData {
  period: string;
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  dailyPageviews: { date: string; views: number }[];
}

export interface GA4TrafficSource {
  channel: string;
  sessions: number;
  users: number;
  percentage: number;
}

export interface GA4TopPage {
  path: string;
  title: string;
  views: number;
  users: number;
}

// --- 임포트된 전략 데이터 ---
export interface ImportedStrategy {
  importedAt: string;
  sourceFileName: string;
  keywords: ImportedKeyword[];
  categories: ImportedCategory[];
}

export interface ImportedKeyword {
  keyword: string;
  totalSearch: number;
  competition: 'high' | 'medium' | 'low';
  isGolden: boolean;
  category?: string;
}

export interface ImportedCategory {
  code: string;
  name: string;
  description: string;
  topics: ImportedTopic[];
}

export interface ImportedTopic {
  id: string;
  title: string;
  angle?: string;
  keywords: string[];
  channels: string[];
  status: 'new' | 'done' | 'similar';
}

// --- 주간 보고서 ---
export interface WeeklyReportData {
  projectName: string;
  period: { start: string; end: string };
  analytics?: {
    sessions: number;
    sessionsDelta: number;
    users: number;
    usersDelta: number;
    pageviews: number;
    pageviewsDelta: number;
    bounceRate: number;
    topPages: GA4TopPage[];
    trafficSources: GA4TrafficSource[];
    dailyPageviews: { date: string; views: number }[];
  };
  content: {
    totalCreated: number;
    totalPublished: number;
    byChannel: { channel: string; count: number }[];
    recentItems: { title: string; channel: string; status: string; date: string }[];
  };
  keywords?: {
    tracked: number;
    goldenKeywords: string[];
  };
}
