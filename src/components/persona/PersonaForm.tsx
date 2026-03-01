'use client';

import { useState } from 'react';
import type { Persona } from '@/types/folder';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import {
  TONE_OPTIONS,
  FIRST_PERSON_OPTIONS,
  STYLE_OPTIONS,
  EMOJI_OPTIONS,
} from '@/lib/constants';
import { X } from 'lucide-react';

interface PersonaFormProps {
  persona: Persona;
  onChange: (persona: Partial<Persona>) => void;
}

export function PersonaForm({ persona, onChange }: PersonaFormProps) {
  const [blacklistInput, setBlacklistInput] = useState('');

  const handleAddBlacklist = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && blacklistInput.trim()) {
      e.preventDefault();
      if (!persona.blacklist.includes(blacklistInput.trim())) {
        onChange({ blacklist: [...persona.blacklist, blacklistInput.trim()] });
      }
      setBlacklistInput('');
    }
  };

  const handleRemoveBlacklist = (word: string) => {
    onChange({ blacklist: persona.blacklist.filter((w) => w !== word) });
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">페르소나 설정</h3>

      <Select
        id="tone"
        label="톤앤매너"
        options={TONE_OPTIONS}
        value={persona.tone}
        onChange={(e) => onChange({ tone: e.target.value })}
      />

      <Select
        id="firstPerson"
        label="1인칭 설정"
        options={FIRST_PERSON_OPTIONS}
        value={persona.firstPerson}
        onChange={(e) => onChange({ firstPerson: e.target.value as Persona['firstPerson'] })}
      />

      <Input
        id="intro"
        label="블로거 소개"
        placeholder="예: 10년차 강남 직장인"
        value={persona.intro}
        onChange={(e) => onChange({ intro: e.target.value })}
      />

      <Select
        id="style"
        label="서술 스타일"
        options={STYLE_OPTIONS}
        value={persona.style}
        onChange={(e) => onChange({ style: e.target.value as Persona['style'] })}
      />

      <Select
        id="emoji"
        label="이모지 사용"
        options={EMOJI_OPTIONS}
        value={persona.emoji}
        onChange={(e) => onChange({ emoji: e.target.value as Persona['emoji'] })}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">금지어 설정</label>
        <input
          value={blacklistInput}
          onChange={(e) => setBlacklistInput(e.target.value)}
          onKeyDown={handleAddBlacklist}
          placeholder="금지어 입력 후 Enter"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {persona.blacklist.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {persona.blacklist.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive"
              >
                {word}
                <button onClick={() => handleRemoveBlacklist(word)} className="hover:text-foreground">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
