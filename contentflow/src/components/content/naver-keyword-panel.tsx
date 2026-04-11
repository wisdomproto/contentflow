'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, TrendingUp } from 'lucide-react';

interface KeywordResult {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  pcClickCount: number;
  mobileClickCount: number;
  pcCtr: number;
  mobileCtr: number;
}

interface NaverKeywordPanelProps {
  onSetPrimary: (keyword: string) => void;
  onAddSecondary: (keyword: string) => void;
  primaryKeyword: string;
  secondaryKeywords: string[];
}

export function NaverKeywordPanel({ onSetPrimary, onAddSecondary, primaryKeyword, secondaryKeywords }: NaverKeywordPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const keywords = query.split(',').map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/naver/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '검색 실패');
        return;
      }
      setResults(data.keywords ?? []);
    } catch (err) {
      setError(`오류: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const competitionLabel = (comp: string) => {
    switch (comp) {
      case 'HIGH': return { text: '높음', color: 'text-red-600 bg-red-50' };
      case 'MEDIUM': return { text: '보통', color: 'text-yellow-600 bg-yellow-50' };
      default: return { text: '낮음', color: 'text-green-600 bg-green-50' };
    }
  };

  const formatNumber = (n: number) => n.toLocaleString('ko-KR');

  const isPrimary = (kw: string) => kw === primaryKeyword;
  const isSecondary = (kw: string) => secondaryKeywords.includes(kw);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold">네이버 키워드 검색</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="키워드 입력 (쉼표로 여러 개)"
          className="text-sm flex-1"
        />
        <Button size="sm" onClick={handleSearch} disabled={isLoading || !query.trim()} className="gap-1.5">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          검색
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {results.length > 0 && (
        <div className="overflow-auto max-h-60 rounded border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-muted/50 sticky top-0">
                <th className="text-left py-1.5 pr-2 font-medium">키워드</th>
                <th className="text-right py-1.5 px-2 font-medium">PC</th>
                <th className="text-right py-1.5 px-2 font-medium">모바일</th>
                <th className="text-right py-1.5 px-2 font-medium">합계</th>
                <th className="text-center py-1.5 px-2 font-medium">경쟁</th>
                <th className="text-right py-1.5 pl-2 font-medium">설정</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const comp = competitionLabel(r.competition);
                const selected = isPrimary(r.keyword) || isSecondary(r.keyword);
                return (
                  <tr key={r.keyword} className={`border-b border-border/50 ${selected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <td className="py-1.5 pr-2 font-medium">
                      {r.keyword}
                      {isPrimary(r.keyword) && <Badge variant="default" className="ml-1.5 text-[9px] py-0 px-1">주요</Badge>}
                      {isSecondary(r.keyword) && <Badge variant="secondary" className="ml-1.5 text-[9px] py-0 px-1">보조</Badge>}
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{formatNumber(r.pcSearchVolume)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{formatNumber(r.mobileSearchVolume)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums font-medium">{formatNumber(r.totalSearchVolume)}</td>
                    <td className="text-center py-1.5 px-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${comp.color}`}>{comp.text}</span>
                    </td>
                    <td className="text-right py-1.5 pl-2">
                      <div className="flex gap-1 justify-end">
                        {!isPrimary(r.keyword) && (
                          <button
                            onClick={() => onSetPrimary(r.keyword)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="주요 키워드로 설정"
                          >
                            주요
                          </button>
                        )}
                        {!isSecondary(r.keyword) && !isPrimary(r.keyword) && (
                          <button
                            onClick={() => onAddSecondary(r.keyword)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                            title="보조 키워드 추가"
                          >
                            <Plus size={10} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
