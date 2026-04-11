// src/components/project/funnel-analytics-section.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, BarChart3, Plus, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import type { Project } from '@/types/database';
import type { FunnelConfig, FunnelStep, GA4Config } from '@/types/analytics';

interface FunnelAnalyticsSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function FunnelAnalyticsSection({ project, onUpdate }: FunnelAnalyticsSectionProps) {
  // --- 퍼널 설정 ---
  const funnel = (project.funnel_config as FunnelConfig | null) ?? {
    websiteUrl: '',
    conversionGoal: '',
    conversionUrl: '',
    funnelSteps: [],
  };
  const [websiteUrl, setWebsiteUrl] = useState(funnel.websiteUrl);
  const [conversionGoal, setConversionGoal] = useState(funnel.conversionGoal);
  const [conversionUrl, setConversionUrl] = useState(funnel.conversionUrl ?? '');
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>(funnel.funnelSteps ?? []);

  // --- GA4 설정 ---
  const ga4 = (project.ga4_config as GA4Config | null) ?? {
    propertyId: '',
    clientEmail: '',
    privateKey: '',
  };
  const [propertyId, setPropertyId] = useState(ga4.propertyId);
  const [clientEmail, setClientEmail] = useState(ga4.clientEmail);
  const [privateKey, setPrivateKey] = useState(ga4.privateKey);
  const [showKey, setShowKey] = useState(false);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const f = (project.funnel_config as FunnelConfig | null);
    setWebsiteUrl(f?.websiteUrl ?? '');
    setConversionGoal(f?.conversionGoal ?? '');
    setConversionUrl(f?.conversionUrl ?? '');
    setFunnelSteps(f?.funnelSteps ?? []);

    const g = (project.ga4_config as GA4Config | null);
    setPropertyId(g?.propertyId ?? '');
    setClientEmail(g?.clientEmail ?? '');
    setPrivateKey(g?.privateKey ?? '');
  }, [project.id]);

  const addFunnelStep = () => {
    setFunnelSteps([...funnelSteps, { name: '', url: '', description: '' }]);
  };

  const updateFunnelStep = (index: number, updates: Partial<FunnelStep>) => {
    setFunnelSteps(funnelSteps.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeFunnelStep = (index: number) => {
    setFunnelSteps(funnelSteps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newFunnelConfig: FunnelConfig = {
      websiteUrl: websiteUrl || '',
      conversionGoal: conversionGoal || '',
      conversionUrl: conversionUrl || undefined,
      funnelSteps: funnelSteps.filter(s => s.name.trim()),
    };
    const newGA4Config: GA4Config | null = propertyId ? {
      propertyId,
      clientEmail,
      privateKey,
    } : null;
    onUpdate({
      funnel_config: newFunnelConfig,
      ga4_config: newGA4Config,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasGA4 = !!(propertyId && clientEmail && privateKey);

  return (
    <div className="space-y-6">
      {/* 메인 퍼널 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe size={18} /> 메인 퍼널 설정
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            모든 마케팅 채널의 최종 착지점 (홈페이지 등)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>웹사이트 URL</Label>
            <Input
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>전환 목표</Label>
              <Input
                placeholder="예: 카카오 상담, 회원가입, 구매"
                value={conversionGoal}
                onChange={(e) => setConversionGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>전환 URL (선택)</Label>
              <Input
                placeholder="예: https://pf.kakao.com/..."
                value={conversionUrl}
                onChange={(e) => setConversionUrl(e.target.value)}
              />
            </div>
          </div>

          {/* 퍼널 단계 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>퍼널 단계</Label>
              <Button variant="ghost" size="sm" onClick={addFunnelStep}>
                <Plus size={14} className="mr-1" /> 단계 추가
              </Button>
            </div>
            {funnelSteps.length === 0 && (
              <p className="text-xs text-muted-foreground">
                퍼널 단계를 추가하면 전환 경로를 시각화할 수 있습니다
              </p>
            )}
            {funnelSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                <Input
                  placeholder="단계명 (예: 검색/SNS)"
                  value={step.name}
                  onChange={(e) => updateFunnelStep(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="URL (선택)"
                  value={step.url ?? ''}
                  onChange={(e) => updateFunnelStep(i, { url: e.target.value })}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeFunnelStep(i)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GA4 연동 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={18} /> Google Analytics 4 연동
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            GA4 서비스 계정을 연결하면 실시간 트래픽 현황을 확인할 수 있습니다
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>GA4 속성 ID (Property ID)</Label>
            <Input
              placeholder="123456789 (숫자만)"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value.replace(/\D/g, ''))}
            />
            <p className="text-xs text-muted-foreground">
              GA4 관리 &gt; 속성 설정에서 확인 (G-XXXXXXX가 아닌 숫자 ID)
            </p>
          </div>
          <div className="space-y-2">
            <Label>서비스 계정 이메일</Label>
            <Input
              placeholder="name@project.iam.gserviceaccount.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>비공개 키 (Private Key)</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="-----BEGIN PRIVATE KEY-----..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Google Cloud Console &gt; 서비스 계정 &gt; 키 관리에서 JSON 키 다운로드 후 private_key 값 붙여넣기
            </p>
          </div>
          {hasGA4 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Check size={14} /> GA4 연결 정보가 설정되었습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          {saved ? <><Check size={14} className="mr-1.5" /> 저장됨</> : '저장'}
        </Button>
      </div>
    </div>
  );
}
