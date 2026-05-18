'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { PublishedSite } from '@/types/database';

const ALL_LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ms', label: 'Melayu' },
  { code: 'id', label: 'Indonesia' },
];

interface Props { projectId: string }

export function PublishedSiteSection({ projectId }: Props) {
  const { projects, updatePublishedSite } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const initial: PublishedSite = project?.published_site || {
    name: '',
    domain: '',
    domain_prefix: '',
    active_languages: ['ko'],
    language_paths: { ko: '/blog' },
    deploy_webhook_url: '',
    enabled: false,
  };

  const [site, setSite] = useState<PublishedSite>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project?.published_site) setSite(project.published_site);
  }, [project?.id]);

  function toggleLang(code: string) {
    const active = site.active_languages.includes(code);
    const next_active = active
      ? site.active_languages.filter((l) => l !== code)
      : [...site.active_languages, code];
    const next_paths = { ...site.language_paths };
    if (!active && !next_paths[code]) {
      next_paths[code] = code === 'ko' ? '/blog' : `/${code}/blog`;
    }
    setSite({ ...site, active_languages: next_active, language_paths: next_paths });
  }

  function updatePath(code: string, path: string) {
    setSite({ ...site, language_paths: { ...site.language_paths, [code]: path } });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePublishedSite(projectId, site);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-border rounded-lg p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">발행 사이트</h3>
        <Switch checked={site.enabled} onCheckedChange={(v) => setSite({ ...site, enabled: v })} />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">사이트 이름</label>
          <Input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} placeholder="dflo" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">도메인 (프로토콜 포함)</label>
          <Input value={site.domain} onChange={(e) => setSite({ ...site, domain: e.target.value })} placeholder="https://www.dr187growup.com" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">개발용 path prefix (옵션, 작업 끝나면 빈값)</label>
        <Input value={site.domain_prefix || ''} onChange={(e) => setSite({ ...site, domain_prefix: e.target.value })} placeholder="/test" />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">활성 언어 + 언어별 path</label>
        {ALL_LANGS.map((l) => {
          const active = site.active_languages.includes(l.code);
          return (
            <div key={l.code} className="flex items-center gap-2">
              <Checkbox checked={active} onCheckedChange={() => toggleLang(l.code)} />
              <span className="w-24 text-sm">{l.label} ({l.code})</span>
              <Input
                disabled={!active}
                className="flex-1"
                value={site.language_paths[l.code] || ''}
                onChange={(e) => updatePath(l.code, e.target.value)}
                placeholder={l.code === 'ko' ? '/blog' : `/${l.code}/blog`}
              />
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Railway Deploy Webhook URL (옵션)</label>
        <Input value={site.deploy_webhook_url || ''} onChange={(e) => setSite({ ...site, deploy_webhook_url: e.target.value })} placeholder="https://backboard.railway.app/..." />
      </div>

      <div className="bg-muted/30 p-3 rounded text-xs space-y-1 font-mono">
        <p className="text-muted-foreground mb-1">본진 사이트 fetch URL (읽기 전용):</p>
        {site.active_languages.map((code) => (
          <p key={code}>
            /api/blog/by-project/{projectId}/posts?lang={code}
          </p>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? '저장 중…' : '저장'}
      </Button>
    </section>
  );
}
