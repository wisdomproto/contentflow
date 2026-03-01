'use client';

interface TitleEditorProps {
  title: string;
  onChange: (title: string) => void;
}

export function TitleEditor({ title, onChange }: TitleEditorProps) {
  return (
    <div className="mb-4">
      <input
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="블로그 제목을 입력하세요..."
        className="w-full bg-transparent text-xl font-bold placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
