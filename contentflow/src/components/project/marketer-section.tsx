'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Project } from '@/types/database';

interface MarketerSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function MarketerSection({ project, onUpdate }: MarketerSectionProps) {
  const [name, setName] = useState(project.marketer_name ?? '');
  const [expertise, setExpertise] = useState(project.marketer_expertise ?? '');
  const [style, setStyle] = useState(project.marketer_style ?? '');
  const [phrases, setPhrases] = useState<string[]>(project.marketer_phrases ?? []);
  const [phraseInput, setPhraseInput] = useState('');
  const [snsGoal, setSnsGoal] = useState(project.sns_goal ?? '');

  useEffect(() => {
    setName(project.marketer_name ?? '');
    setExpertise(project.marketer_expertise ?? '');
    setStyle(project.marketer_style ?? '');
    setPhrases(project.marketer_phrases ?? []);
    setSnsGoal(project.sns_goal ?? '');
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    onUpdate({
      marketer_name: name || null,
      marketer_expertise: expertise || null,
      marketer_style: style || null,
      marketer_phrases: phrases.length > 0 ? phrases : null,
      sns_goal: snsGoal || null,
    });
  };

  const addPhrase = () => {
    const p = phraseInput.trim();
    if (p && !phrases.includes(p)) {
      setPhrases([...phrases, p]);
      setPhraseInput('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>마케터 프로필</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="marketer-name">마케터 이름/별칭</Label>
            <Input id="marketer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="AI가 콘텐츠 작성 시 활용할 화자 정보" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketer-expertise">전문 분야</Label>
            <Input id="marketer-expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="예: 건강/영양 전문가, IT 교육 전문가" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketer-style">어조 및 스타일</Label>
            <Textarea id="marketer-style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="구체적 문체 가이드 (예: 전문적이지만 친근한, 데이터 기반 논리적)" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sns-goal">SNS 운영 목표</Label>
            <Input id="sns-goal" value={snsGoal} onChange={(e) => setSnsGoal(e.target.value)} placeholder="예: 브랜딩 + 판매 전환" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>자주 사용하는 표현</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">AI 생성 시 자연스럽게 포함될 표현 목록</p>
          <div className="flex flex-wrap gap-1.5">
            {phrases.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1">
                {p}
                <button onClick={() => setPhrases(phrases.filter((x) => x !== p))} className="hover:text-destructive">
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhrase(); } }}
              placeholder="표현 입력 후 Enter"
            />
            <Button variant="outline" size="sm" onClick={addPhrase}>추가</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
