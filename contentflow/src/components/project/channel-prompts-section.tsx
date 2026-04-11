'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BookOpen, Image, MessageCircle, Youtube } from 'lucide-react';
import type { Project } from '@/types/database';

const TONE_PRESETS: Record<string, string> = {
  '공식적': '격식 있는 문체로 작성합니다. ~입니다/~습니다 체를 사용하며, 정확한 정보 전달에 중점을 둡니다.',
  '캐주얼': '친근하고 편안한 톤으로 작성합니다. ~해요/~이에요 체를 사용하며, 독자와 대화하듯 씁니다.',
  '교육적': '쉽고 명확하게 설명하는 교육적 톤으로 작성합니다. 전문 용어는 풀어서 설명합니다.',
  '감성적': '감성적이고 공감을 이끌어내는 문체로 작성합니다. 스토리텔링과 감정 표현을 활용합니다.',
};

const IMAGE_PRESETS: Record<string, string> = {
  '사진풍': '실제 사진처럼 사실적인 이미지. 자연스러운 조명과 구도를 사용합니다.',
  '일러스트': '밝고 깔끔한 플랫 일러스트 스타일. 파스텔 톤 색상을 사용합니다.',
  '미니멀': '미니멀하고 깔끔한 디자인. 여백을 활용하고 핵심 요소만 표현합니다.',
  '3D 렌더링': '3D 렌더링 스타일의 입체적 이미지. 부드러운 그림자와 질감을 표현합니다.',
};

interface ChannelConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  toneField: keyof Project;
  imageField: keyof Project | null;
}

const CHANNELS: ChannelConfig[] = [
  { key: 'blog', label: '블로그', icon: BookOpen, toneField: 'blog_tone_prompt', imageField: 'blog_image_style_prompt' },
  { key: 'instagram', label: '인스타그램', icon: Image, toneField: 'instagram_tone_prompt', imageField: 'instagram_image_style_prompt' },
  { key: 'threads', label: '스레드', icon: MessageCircle, toneField: 'threads_tone_prompt', imageField: null },
  { key: 'youtube', label: '유튜브', icon: Youtube, toneField: 'youtube_tone_prompt', imageField: 'youtube_image_style_prompt' },
];

interface ChannelPromptsSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function ChannelPromptsSection({ project, onUpdate }: ChannelPromptsSectionProps) {
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const ch of CHANNELS) {
      initial[ch.toneField] = (project[ch.toneField] as string) ?? '';
      if (ch.imageField) {
        initial[ch.imageField] = (project[ch.imageField] as string) ?? '';
      }
    }
    setPrompts(initial);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePrompt = (field: string, value: string) => {
    setPrompts((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const updates: Partial<Project> = {};
    for (const [key, value] of Object.entries(prompts)) {
      (updates as Record<string, string | null>)[key] = value || null;
    }
    onUpdate(updates);
  };

  return (
    <div className="space-y-6">
      {CHANNELS.map((ch) => {
        const Icon = ch.icon;
        return (
          <Card key={ch.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon size={18} /> {ch.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>말투 프롬프트</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.keys(TONE_PRESETS).map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => updatePrompt(ch.toneField, TONE_PRESETS[preset])}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={prompts[ch.toneField] ?? ''}
                  onChange={(e) => updatePrompt(ch.toneField, e.target.value)}
                  placeholder="AI가 글을 작성할 때 적용할 문체를 입력하세요..."
                  rows={3}
                />
              </div>
              {ch.imageField && (
                <div className="space-y-2">
                  <Label>그림체 프롬프트</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.keys(IMAGE_PRESETS).map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => updatePrompt(ch.imageField!, IMAGE_PRESETS[preset])}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={prompts[ch.imageField] ?? ''}
                    onChange={(e) => updatePrompt(ch.imageField!, e.target.value)}
                    placeholder="이미지 생성 시 적용할 스타일을 입력하세요..."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
