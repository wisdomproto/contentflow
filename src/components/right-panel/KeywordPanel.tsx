'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useContentStore } from '@/stores/useContentStore';
import { TrendingUp, Search, Loader2, RefreshCw } from 'lucide-react';

interface KeywordRow {
  keyword: string;
  monthlyTotal: number;
  mobileRatio: number;
  competition: string;
}

export function KeywordPanel() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;

  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedKeywords, setLastFetchedKeywords] = useState<string>('');

  const keywords = useMemo(() => content?.source.keywords ?? [], [content?.source.keywords]);
  const keywordsKey = keywords.join(',');

  const fetchKeywordData = useCallback(async (kws: string[]) => {
    if (kws.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '키워드 데이터 조회 실패');
      }

      const mapped: KeywordRow[] = (data.keywords || []).slice(0, 10).map(
        (stat: { relKeyword: string; monthlyPcQcCnt: number; monthlyMobileQcCnt: number; compIdx: string }) => {
          const pcCount = stat.monthlyPcQcCnt || 0;
          const mobileCount = stat.monthlyMobileQcCnt || 0;
          const total = pcCount + mobileCount;
          return {
            keyword: stat.relKeyword,
            monthlyTotal: total,
            mobileRatio: total > 0 ? Math.round((mobileCount / total) * 100) : 0,
            competition: stat.compIdx || '정보없음',
          };
        },
      );

      setRows(mapped);
      setLastFetchedKeywords(kws.join(','));
    } catch (err) {
      setError(err instanceof Error ? err.message : '키워드 데이터 조회 실패');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch when keywords change
  useEffect(() => {
    if (keywordsKey && keywordsKey !== lastFetchedKeywords) {
      fetchKeywordData(keywords);
    }
  }, [keywordsKey, lastFetchedKeywords, keywords, fetchKeywordData]);

  const blueOcean = rows
    .filter((r) => r.competition === '낮음' && r.monthlyTotal > 0)
    .slice(0, 3)
    .map((r) => r.keyword);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">키워드 검색량</h3>
        </div>
        {keywords.length > 0 && !isLoading && (
          <button
            onClick={() => fetchKeywordData(keywords)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="새로고침"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {!content?.source.topic && keywords.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          주제를 입력하면 관련 키워드 검색량을 확인할 수 있습니다
        </p>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">검색량 조회 중...</span>
        </div>
      ) : error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          {error}
          <button
            onClick={() => fetchKeywordData(keywords)}
            className="ml-2 underline"
          >
            다시 시도
          </button>
        </div>
      ) : rows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            네이버 검색광고 기준 실시간 데이터
          </p>
          <div className="rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium">키워드</th>
                  <th className="px-2 py-1.5 text-right font-medium">월간</th>
                  <th className="px-2 py-1.5 text-right font-medium">모바일%</th>
                  <th className="px-2 py-1.5 text-right font-medium">경쟁</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.keyword} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 font-medium text-primary">{row.keyword}</td>
                    <td className="px-2 py-1.5 text-right">
                      {row.monthlyTotal.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right">{row.mobileRatio}%</td>
                    <td className="px-2 py-1.5 text-right">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          row.competition === '낮음'
                            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                            : row.competition === '중간'
                              ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {row.competition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {blueOcean.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp size={12} className="text-green-500 dark:text-green-400" />
              블루오션: <span className="font-medium text-green-600 dark:text-green-400">{blueOcean.join(', ')}</span>
            </div>
          )}
        </div>
      ) : keywords.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          키워드 데이터가 없습니다. 키워드를 추가해보세요.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          기본 설정에서 키워드를 입력하면 검색량을 확인할 수 있습니다
        </p>
      )}
    </div>
  );
}
