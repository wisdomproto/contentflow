'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/stores/project-store';
import { Loader2, Plus, X, Sparkles, Search, Users } from 'lucide-react';
import type { StrategyInput } from '@/types/strategy';
import type { CrawlResult } from '@/types/strategy';

interface StrategyInputFormProps {
  onSubmit: (input: StrategyInput) => void;
  isGenerating: boolean;
}

export function StrategyInputForm({ onSubmit, isGenerating }: StrategyInputFormProps) {
  const { selectedProjectId, projects } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  const [targetUrls, setTargetUrls] = useState<string[]>(['']);
  const [industry, setIndustry] = useState(project?.industry || '');
  const [services, setServices] = useState(project?.brand_description || '');
  const [targetCustomer, setTargetCustomer] = useState(() => {
    if (!project?.target_audience) return '';
    if (typeof project.target_audience === 'string') return project.target_audience;
    return Object.values(project.target_audience).filter(Boolean).join(', ');
  });
  const [usp, setUsp] = useState(project?.usp || '');
  const [channels, setChannels] = useState(project?.brand_name ? '네이버 블로그, 인스타그램, 유튜브, 스레드' : '');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [competitors, setCompetitors] = useState<{ name: string; url?: string }[]>([]);
  const [competitorInput, setCompetitorInput] = useState('');
  const [monthlyRange, setMonthlyRange] = useState('');
  const [teamSize, setTeamSize] = useState('1');
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [isSuggestingCompetitors, setIsSuggestingCompetitors] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ keyword: string; reason: string; type: string }[]>([]);
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<{ name: string; url?: string; type: string; reason: string; strength: string }[]>([]);

  const suggestKeywords = async () => {
    if (!industry && !services) return;
    setIsSuggestingKeywords(true);
    try {
      // Crawl URLs first if available
      let crawlData: CrawlResult[] | undefined;
      const validUrls = targetUrls.filter(Boolean);
      if (validUrls.length > 0) {
        const crawlRes = await fetch('/api/ai/strategy/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: validUrls }),
        });
        if (crawlRes.ok) {
          const d = await crawlRes.json();
          crawlData = d.results;
        }
      }

      const res = await fetch('/api/ai/strategy/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, services, targetCustomer, usp, crawlData }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedKeywords(data.keywords || []);
        // Auto-fill seed keywords
        const kwList = (data.keywords || []).map((k: { keyword: string }) => k.keyword);
        setSeedKeywords(kwList.join(', '));
      }
    } catch { /* ignore */ }
    setIsSuggestingKeywords(false);
  };

  const suggestCompetitors = async () => {
    if (!industry && !services) return;
    setIsSuggestingCompetitors(true);
    try {
      const res = await fetch('/api/ai/strategy/suggest-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, services, targetCustomer, usp }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedCompetitors(data.competitors || []);
        setCompetitors((data.competitors || []).map((c: { name: string; url?: string }) => ({ name: c.name, url: c.url })));
      }
    } catch { /* ignore */ }
    setIsSuggestingCompetitors(false);
  };

  const handleSubmit = () => {
    const input: StrategyInput = {
      targetUrls: targetUrls.filter(Boolean),
      businessInfo: {
        industry,
        services,
        targetCustomer,
        usp,
        channels: channels.split(',').map((c) => c.trim()).filter(Boolean),
      },
      seedKeywords: seedKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      competitors,
      budget: monthlyRange ? { monthlyRange, teamSize: parseInt(teamSize) || 1 } : undefined,
    };
    onSubmit(input);
  };

  const addUrl = () => setTargetUrls([...targetUrls, '']);
  const removeUrl = (i: number) => setTargetUrls(targetUrls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) => setTargetUrls(targetUrls.map((u, idx) => (idx === i ? v : u)));

  const addCompetitor = () => {
    if (!competitorInput.trim()) return;
    setCompetitors([...competitors, { name: competitorInput.trim() }]);
    setCompetitorInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI 마케팅 전략 생성</h2>
        <p className="text-sm text-muted-foreground">비즈니스 정보를 입력하면 AI가 통합 마케팅 전략을 수립합니다.</p>
      </div>

      {/* 타겟 URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🔗 타겟 URL (선택)</label>
        {targetUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="https://example.com" value={url} onChange={(e) => updateUrl(i, e.target.value)} />
            {targetUrls.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeUrl(i)}><X size={16} /></Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addUrl}><Plus size={14} className="mr-1" />URL 추가</Button>
      </div>

      {/* 비즈니스 정보 */}
      <div className="space-y-3">
        <label className="text-sm font-medium">🏢 비즈니스 정보 (필수)</label>
        <Input placeholder="업종 (예: 소아 성장 클리닉)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <Textarea placeholder="주요 서비스/제품 설명" value={services} onChange={(e) => setServices(e.target.value)} rows={2} />
        <Input placeholder="타겟 고객 (예: 초등학생 자녀를 둔 30~45세 부모)" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} />
        <Input placeholder="차별화 포인트 (USP)" value={usp} onChange={(e) => setUsp(e.target.value)} />
        <Input placeholder="보유 채널 (쉼표 구분)" value={channels} onChange={(e) => setChannels(e.target.value)} />
      </div>

      {/* 키워드 시드 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">🔍 핵심 키워드 (필수, 쉼표 구분)</label>
          <Button variant="outline" size="sm" onClick={suggestKeywords} disabled={isSuggestingKeywords || (!industry && !services)}>
            {isSuggestingKeywords ? <><Loader2 size={14} className="animate-spin mr-1" />분석 중...</> : <><Search size={14} className="mr-1" />AI 키워드 추천</>}
          </Button>
        </div>
        <Textarea placeholder="성장클리닉, 키크는법, 성조숙증, 성장호르몬" value={seedKeywords} onChange={(e) => setSeedKeywords(e.target.value)} rows={2} />
        {suggestedKeywords.length > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1.5">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">AI 추천 키워드 ({suggestedKeywords.length}개)</div>
            <div className="flex gap-1.5 flex-wrap">
              {suggestedKeywords.map((k, i) => (
                <span key={i} className="group relative px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium cursor-default" title={`${k.reason} [${k.type}]`}>
                  {k.keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 경쟁사 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">⚔️ 경쟁사 (선택)</label>
          <Button variant="outline" size="sm" onClick={suggestCompetitors} disabled={isSuggestingCompetitors || (!industry && !services)}>
            {isSuggestingCompetitors ? <><Loader2 size={14} className="animate-spin mr-1" />탐색 중...</> : <><Users size={14} className="mr-1" />AI 경쟁사 탐색</>}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input placeholder="경쟁사 이름 (직접 추가)" value={competitorInput} onChange={(e) => setCompetitorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompetitor()} />
          <Button variant="outline" onClick={addCompetitor}><Plus size={14} /></Button>
        </div>
        {competitors.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {competitors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
                {c.name}
                <button onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        {suggestedCompetitors.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">AI 탐색 경쟁사 ({suggestedCompetitors.length}개)</div>
            <div className="space-y-1">
              {suggestedCompetitors.map((c, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="ml-1.5 px-1.5 py-0.5 bg-muted rounded text-[10px]">{c.type === 'direct' ? '직접' : '간접'}</span>
                  <span className="ml-1.5">{c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 예산 & 인력 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">💰 월 마케팅 예산 (선택)</label>
          <Input placeholder="예: 300-500만원" value={monthlyRange} onChange={(e) => setMonthlyRange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">👥 담당 인원</label>
          <Input type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
        </div>
      </div>

      {/* Submit */}
      <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={isGenerating || !industry || !seedKeywords}>
        {isGenerating ? (
          <><Loader2 size={18} className="animate-spin mr-2" />전략 생성 중...</>
        ) : (
          <><Sparkles size={18} className="mr-2" />전략 생성하기</>
        )}
      </Button>
    </div>
  );
}
