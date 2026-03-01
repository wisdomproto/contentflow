'use client';

import { TiptapEditor } from '@/components/editor/TiptapEditor';

interface SectionTextProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function SectionText({ content, onChange, placeholder }: SectionTextProps) {
  return (
    <TiptapEditor
      content={content}
      onChange={onChange}
      placeholder={placeholder || '본문을 작성하세요...'}
    />
  );
}
