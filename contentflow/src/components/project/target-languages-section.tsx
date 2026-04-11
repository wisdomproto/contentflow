'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Languages } from 'lucide-react';
import type { Project } from '@/types/database';

const AVAILABLE_LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

interface TargetLanguagesSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function TargetLanguagesSection({ project, onUpdate }: TargetLanguagesSectionProps) {
  const targetLanguages: string[] = project.target_languages ?? [];

  const addLanguage = (code: string | null) => {
    if (!code) return;
    if (!targetLanguages.includes(code)) {
      onUpdate({ target_languages: [...targetLanguages, code] });
    }
  };

  const removeLanguage = (code: string) => {
    onUpdate({ target_languages: targetLanguages.filter((l) => l !== code) });
  };

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    (lang) => !targetLanguages.includes(lang.code)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages size={16} />
          타겟 언어
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          콘텐츠를 생성할 타겟 언어를 선택하세요. AI가 해당 언어에 맞게 콘텐츠를 최적화합니다.
        </p>

        {/* 현재 선택된 언어 뱃지 */}
        <div className="flex flex-wrap gap-2 min-h-[36px]">
          {targetLanguages.length === 0 ? (
            <span className="text-sm text-muted-foreground">선택된 언어가 없습니다.</span>
          ) : (
            targetLanguages.map((code) => {
              const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
              if (!lang) return null;
              return (
                <Badge
                  key={code}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive group"
                  onClick={() => removeLanguage(code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  <X size={12} className="ml-0.5 opacity-50 group-hover:opacity-100" />
                </Badge>
              );
            })
          )}
        </div>

        {/* 언어 추가 드롭다운 */}
        {availableToAdd.length > 0 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={addLanguage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="언어 추가..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {targetLanguages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            뱃지를 클릭하면 해당 언어를 제거합니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
