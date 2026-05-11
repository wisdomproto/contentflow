'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { ExternalLink, FileText } from 'lucide-react';

interface TemplateMeta {
  filename: string;
  title: string;
  description: string;
  size: number;
  modifiedAt: string;
  url: string;
}

export function StrategyDashboard() {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === s.selectedProjectId));

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/strategy/templates')
      .then((r) => r.json())
      .then((d) => {
        const items: TemplateMeta[] = d.templates ?? [];
        setTemplates(items);
        if (items.length > 0) {
          setSelected((prev) => prev || items[0].filename);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : '템플릿을 불러올 수 없습니다'))
      .finally(() => setLoading(false));
  }, []);

  const selectedTpl = templates.find((t) => t.filename === selected);

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background sticky top-0 z-10 px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            <span className="text-base font-bold">마케팅 전략</span>
            <span className="text-xs text-muted-foreground">· {project.name}</span>
          </div>
          <div className="flex-1 min-w-[240px] max-w-[520px]">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading || templates.length === 0}
              className="w-full px-3 py-1.5 rounded-md border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {loading && <option>불러오는 중…</option>}
              {!loading && templates.length === 0 && <option>등록된 마케팅 전략 파일이 없습니다</option>}
              {templates.map((t) => (
                <option key={t.filename} value={t.filename}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          {selectedTpl && (
            <a
              href={selectedTpl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              새 창 열기 <ExternalLink size={11} />
            </a>
          )}
        </div>
        {selectedTpl?.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{selectedTpl.description}</p>
        )}
      </div>

      <div className="flex-1 overflow-hidden bg-muted/20">
        {error && (
          <div className="p-6 text-sm text-red-600">{error}</div>
        )}
        {!error && selectedTpl && (
          <iframe
            key={selectedTpl.filename}
            src={selectedTpl.url}
            className="w-full h-full border-0 bg-white"
            title={selectedTpl.title}
          />
        )}
        {!error && !selectedTpl && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <FileText size={32} className="opacity-40" />
            <p className="text-sm">마케팅 전략 파일을 선택하세요</p>
            <p className="text-xs">파일은 <code className="bg-muted px-1.5 py-0.5 rounded">public/strategy-templates/</code> 폴더에 넣으세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
