'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, X, Tag, FolderOpen, ListChecks } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import type { ImportedStrategy, ImportedKeyword, ImportedCategory } from '@/types/analytics';

interface StrategyImportDialogProps {
  projectId: string;
  onClose: () => void;
}

interface TemplateMeta {
  filename: string;
  title: string;
  description: string;
  size: number;
  modifiedAt: string;
  url: string;
}

export function StrategyImportDialog({ projectId, onClose }: StrategyImportDialogProps) {
  const [mode, setMode] = useState<'template' | 'upload'>('template');
  const [file, setFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [result, setResult] = useState<{
    keywords: ImportedKeyword[];
    categories: ImportedCategory[];
    keywordCount: number;
    categoryCount: number;
    topicCount: number;
    fileName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importStrategy = useProjectStore(s => s.importStrategy);

  useEffect(() => {
    fetch('/api/strategy/templates')
      .then(r => r.json())
      .then(data => setTemplates(data.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.name.endsWith('.html')) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      if (mode === 'template') {
        const tpl = templates.find(t => t.filename === selectedTemplate);
        if (!tpl) throw new Error('템플릿을 선택하세요');
        const htmlRes = await fetch(tpl.url);
        if (!htmlRes.ok) throw new Error('템플릿 파일을 불러올 수 없습니다');
        const blob = await htmlRes.blob();
        formData.append('file', new File([blob], tpl.filename, { type: 'text/html' }));
      } else {
        if (!file) throw new Error('파일을 선택하세요');
        formData.append('file', file);
      }

      const res = await fetch('/api/strategy/import-html', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파싱 실패');
    } finally {
      setLoading(false);
    }
  };

  const canParse = mode === 'template' ? !!selectedTemplate : !!file;
  const sourceName = mode === 'template'
    ? templates.find(t => t.filename === selectedTemplate)?.filename
    : file?.name;

  const handleImport = () => {
    if (!result) return;
    const finalName = sourceName ?? 'imported-strategy.html';

    const imported: ImportedStrategy = {
      importedAt: new Date().toISOString(),
      sourceFileName: finalName,
      keywords: result.keywords,
      categories: result.categories,
    };

    importStrategy(projectId, imported);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background rounded-xl border shadow-xl w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">마케팅 전략 HTML 임포트</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="p-4 space-y-4">
          {/* 모드 탭 */}
          <div className="flex gap-1 border-b">
            <button
              type="button"
              onClick={() => { setMode('template'); setResult(null); setError(null); }}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${mode === 'template' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <ListChecks size={14} className="inline mr-1.5" />템플릿 선택
            </button>
            <button
              type="button"
              onClick={() => { setMode('upload'); setResult(null); setError(null); }}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${mode === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Upload size={14} className="inline mr-1.5" />파일 업로드
            </button>
          </div>

          {/* 템플릿 드롭다운 */}
          {mode === 'template' && (
            <div className="space-y-2">
              {templatesLoading ? (
                <p className="text-sm text-muted-foreground py-3 text-center">템플릿 목록 불러오는 중...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">저장된 템플릿이 없습니다 (public/strategy-templates/)</p>
              ) : (
                <>
                  <label className="text-xs font-semibold text-muted-foreground">템플릿 선택</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => { setSelectedTemplate(e.target.value); setResult(null); setError(null); }}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— 선택하세요 —</option>
                    {templates.map(t => (
                      <option key={t.filename} value={t.filename}>{t.title}</option>
                    ))}
                  </select>
                  {selectedTemplate && (() => {
                    const tpl = templates.find(t => t.filename === selectedTemplate);
                    if (!tpl) return null;
                    return (
                      <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2.5 space-y-1">
                        <div className="font-medium text-foreground">{tpl.filename}</div>
                        {tpl.description && <div>{tpl.description}</div>}
                        <div className="flex gap-3 text-[11px] opacity-70">
                          <span>{(tpl.size / 1024).toFixed(0)} KB</span>
                          <span>수정 {new Date(tpl.modifiedAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 파일 업로드 */}
          {mode === 'upload' && (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".html" onChange={handleFileSelect} className="hidden" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={20} className="text-primary" />
                  <span className="font-semibold">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">마케팅 전략 HTML 파일을 선택하세요</p>
                </>
              )}
            </div>
          )}

          {canParse && !result && (
            <Button onClick={handleParse} disabled={loading} className="w-full">
              {loading ? '분석 중...' : (mode === 'template' ? '템플릿 분석' : '파일 분석')}
            </Button>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* 파싱 결과 미리보기 */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{result.keywordCount}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-500">키워드</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-purple-700 dark:text-purple-400">{result.categoryCount}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-500">카테고리</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{result.topicCount}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-500">주제</div>
                </div>
              </div>

              {/* 황금키워드 미리보기 */}
              {result.keywords.filter(k => k.isGolden).length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <Tag size={12} /> 황금 키워드
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {result.keywords.filter(k => k.isGolden).map(k => (
                      <span key={k.keyword} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-full font-semibold">
                        {k.keyword} ({k.totalSearch.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 카테고리 미리보기 */}
              {result.categories.map(cat => (
                <div key={cat.code} className="border rounded-lg p-3">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1">
                    <FolderOpen size={12} />
                    <span className="text-primary">{cat.code}</span> {cat.name}
                    <span className="text-muted-foreground ml-1">({cat.topics.length}개 주제)</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                </div>
              ))}

              <Button onClick={handleImport} className="w-full">
                <Check size={14} className="mr-1.5" /> 프로젝트에 적용
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
