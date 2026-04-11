'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useStrategyGeneration } from '@/hooks/use-strategy-generation';
import { StrategyInputForm } from './strategy-input-form';
import { StrategyHero } from './strategy-hero';
import { StrategyTabs } from './strategy-tabs';
import { OverviewTab } from './overview-tab';
import { KeywordTab } from './keyword-tab';
import { ChannelTab } from './channel-tab';
import { ContentTab } from './content-tab';
import { KpiTab } from './kpi-tab';
import type { StrategyTab, StrategyInput, KeywordItem, KeywordData, ContentStrategyData, HeroStat } from '@/types/strategy';
import type { ImportedStrategy } from '@/types/analytics';

/**
 * ImportedStrategy → 기존 탭 데이터 형식으로 변환
 */
function convertImportedKeywords(imported: ImportedStrategy): { keywordData: KeywordData; naverKeywords: KeywordItem[] } {
  const items: KeywordItem[] = imported.keywords.map(k => ({
    keyword: k.keyword,
    totalSearch: k.totalSearch,
    pcSearch: 0,
    mobileSearch: 0,
    mobileRatio: 0,
    competition: k.competition,
    plAvgDepth: 0,
    pcClickCount: 0,
    mobileClickCount: 0,
    pcCtr: 0,
    mobileCtr: 0,
    category: k.category ?? '',
    isGolden: k.isGolden,
  }));

  const goldenKeywords = imported.keywords
    .filter(k => k.isGolden)
    .map((k, i) => ({
      keyword: k.keyword,
      totalSearch: k.totalSearch,
      competition: k.competition === 'high' ? '높음' : k.competition === 'medium' ? '중간' : '낮음',
      strategy: '',
      priority: i + 1,
    }));

  const categories = [...new Set(imported.keywords.map(k => k.category).filter(Boolean))] as string[];

  return {
    keywordData: {
      items,
      goldenKeywords,
      insights: [],
      trends: [],
      categories,
    },
    naverKeywords: items,
  };
}

function convertImportedTopics(imported: ImportedStrategy): ContentStrategyData {
  return {
    categories: imported.categories.map(c => ({
      code: c.code,
      name: c.name,
      description: c.description,
      topicCount: c.topics.length,
    })),
    cycleInfo: `${imported.categories.length}개 카테고리 순환`,
    categoryRatios: imported.categories.map(c => `${c.code}:${c.topics.length}`).join(', '),
    topics: imported.categories.flatMap(c =>
      c.topics.map(t => ({
        id: t.id,
        category: c.code,
        title: t.title,
        angle: t.angle ?? '',
        keywords: t.keywords,
        targetChannels: t.channels.length > 0 ? t.channels : ['블로그', '카드뉴스', '스레드', '유튜브'],
        source: '',
        youtubeStatus: t.status as 'new' | 'done' | 'similar',
      }))
    ),
  };
}

function buildImportedHeroStats(imported: ImportedStrategy): HeroStat[] {
  const totalKeywords = imported.keywords.length;
  const goldenCount = imported.keywords.filter(k => k.isGolden).length;
  const totalTopics = imported.categories.reduce((sum, c) => sum + c.topics.length, 0);
  const newTopics = imported.categories.reduce((sum, c) => sum + c.topics.filter(t => t.status === 'new').length, 0);

  return [
    { value: String(totalKeywords), label: '분석 키워드' },
    { value: String(goldenCount), label: '황금 키워드' },
    { value: String(totalTopics), label: '콘텐츠 주제' },
    { value: String(newTopics), label: '미게시 주제' },
  ];
}

export function StrategyDashboard() {
  const { selectedProjectId, projects, getStrategy, createOrUpdateStrategy, updateStrategyTab, updateStrategyStatus } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const strategy = selectedProjectId ? getStrategy(selectedProjectId) : undefined;
  const importedStrategy = (project?.imported_strategy ?? null) as unknown as ImportedStrategy | null;

  const [activeTab, setActiveTab] = useState<StrategyTab>('keywords');
  const [naverKeywords, setNaverKeywords] = useState<KeywordItem[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // 임포트된 전략 데이터를 탭 형식으로 변환
  const importedData = useMemo(() => {
    if (!importedStrategy) return null;
    const { keywordData, naverKeywords: importedNaverKw } = convertImportedKeywords(importedStrategy);
    const contentData = convertImportedTopics(importedStrategy);
    const heroStats = buildImportedHeroStats(importedStrategy);
    return { keywordData, naverKeywords: importedNaverKw, contentData, heroStats };
  }, [importedStrategy]);

  // Use ref to always get fresh strategy ID in callbacks
  const strategyIdRef = useRef<string | null>(null);

  const { isGenerating, generate } = useStrategyGeneration({
    onTabStart: (tab) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, {
          overall: 'generating',
          tabs: { [tab]: { status: 'generating' } } as Record<StrategyTab, { status: 'generating' }>,
        });
      }
    },
    onTabComplete: (tab, data) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyTab(sid, tab, data);
      }
    },
    onTabError: (tab, error) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, {
          tabs: { [tab]: { status: 'error', errorMessage: error } } as Record<StrategyTab, { status: 'error'; errorMessage: string }>,
        });
      }
    },
    onComplete: () => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, { overall: 'complete' });
      }
    },
  });

  const handleSubmit = useCallback(async (input: StrategyInput) => {
    if (!selectedProjectId) return;

    // Create strategy and capture ID via ref
    const id = createOrUpdateStrategy(selectedProjectId, input);
    strategyIdRef.current = id;

    // Immediately set status to generating so UI switches to dashboard
    updateStrategyStatus(id, { overall: 'generating' });
    setShowDashboard(true);

    // 1. Fetch Naver keywords (non-blocking on failure)
    let keywordData: KeywordItem[] = [];
    try {
      const kwRes = await fetch('/api/naver/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: input.seedKeywords }),
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        keywordData = (kwData.keywords || []).map((k: { keyword: string; pcSearchVolume: number; mobileSearchVolume: number; totalSearchVolume: number; competition: string; pcClickCount: number; mobileClickCount: number; pcCtr: number; mobileCtr: number }) => ({
          keyword: k.keyword,
          totalSearch: k.totalSearchVolume,
          pcSearch: k.pcSearchVolume,
          mobileSearch: k.mobileSearchVolume,
          mobileRatio: k.totalSearchVolume ? Math.round((k.mobileSearchVolume / k.totalSearchVolume) * 100) : 0,
          competition: (k.competition === 'HIGH' ? 'high' : k.competition === 'MEDIUM' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          plAvgDepth: 0,
          pcClickCount: k.pcClickCount,
          mobileClickCount: k.mobileClickCount,
          pcCtr: k.pcCtr,
          mobileCtr: k.mobileCtr,
          category: '',
          isGolden: false,
        }));
        setNaverKeywords(keywordData);
      }
    } catch { /* continue without keyword data */ }

    // 2. Crawl URLs (non-blocking on failure)
    let crawlData;
    if (input.targetUrls.length > 0) {
      try {
        const crawlRes = await fetch('/api/ai/strategy/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: input.targetUrls }),
        });
        if (crawlRes.ok) {
          const d = await crawlRes.json();
          crawlData = d.results;
        }
      } catch { /* continue without crawl data */ }
    }

    // 3. Generate strategy via AI
    generate(input, keywordData, crawlData);
  }, [selectedProjectId, createOrUpdateStrategy, updateStrategyStatus, generate]);

  if (!project) return null;

  // AI 생성된 전략이 있는지
  const hasAiStrategy = strategy && (strategy.generationStatus.overall !== 'idle' || showDashboard);
  // 임포트된 전략이 있는지
  const hasImported = !!importedData;

  // 둘 다 없으면 입력폼 표시
  if (!hasAiStrategy && !hasImported) {
    return (
      <div className="flex-1 overflow-y-auto">
        <StrategyInputForm onSubmit={handleSubmit} isGenerating={isGenerating} />
      </div>
    );
  }

  // 데이터 결합: AI 전략 > 임포트 전략 (AI가 있으면 AI 우선, 없으면 임포트 사용)
  const heroStats = strategy?.overview?.heroStats || importedData?.heroStats || [];
  const keywordTabData = strategy?.keywords || importedData?.keywordData || null;
  const contentTabData = strategy?.contentStrategy || importedData?.contentData || null;
  const effectiveNaverKeywords = naverKeywords.length > 0 ? naverKeywords : (importedData?.naverKeywords || []);

  const defaultTabStatus = { status: (hasAiStrategy ? 'idle' : 'complete') as 'idle' | 'complete' };
  const importedTabStatuses = {
    overview: defaultTabStatus,
    keywords: { status: 'complete' as const },
    channelStrategy: defaultTabStatus,
    contentStrategy: { status: 'complete' as const },
    kpiAction: defaultTabStatus,
  };

  return (
    <div className="flex flex-col h-full">
      <StrategyHero
        projectName={project.name}
        stats={heroStats}
      />
      {/* 임포트 출처 표시 */}
      {hasImported && !hasAiStrategy && importedStrategy && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          📋 임포트된 전략: <strong>{importedStrategy.sourceFileName}</strong>
          <span className="text-emerald-500 ml-2">({new Date(importedStrategy.importedAt).toLocaleDateString('ko-KR')})</span>
        </div>
      )}
      <StrategyTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabStatuses={strategy?.generationStatus.tabs || importedTabStatuses}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {isGenerating && !strategy?.overview && activeTab === 'overview' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">AI가 마케팅 전략을 수립하고 있습니다...</p>
            </div>
          )}
          {activeTab === 'overview' && strategy?.overview && <OverviewTab data={strategy.overview} />}
          {activeTab === 'overview' && !strategy?.overview && !isGenerating && (
            <div className="text-center text-muted-foreground py-16">
              <p className="mb-2">개요 데이터가 없습니다</p>
              <p className="text-xs">키워드, 콘텐츠·주제 탭에서 임포트된 데이터를 확인하세요</p>
            </div>
          )}
          {activeTab === 'keywords' && <KeywordTab data={keywordTabData} naverKeywords={effectiveNaverKeywords} />}
          {activeTab === 'channelStrategy' && <ChannelTab data={strategy?.channelStrategy || null} />}
          {activeTab === 'contentStrategy' && <ContentTab data={contentTabData} />}
          {activeTab === 'kpiAction' && <KpiTab data={strategy?.kpiAction || null} />}
        </div>
      </div>
    </div>
  );
}
