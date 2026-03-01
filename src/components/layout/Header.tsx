'use client';

import { useState, useEffect } from 'react';
import { Save, Download, PanelLeftClose, PanelLeft, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/useUIStore';
import { toast } from '@/components/ui/Toast';

export function Header() {
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  const handleSave = () => {
    toast('저장되었습니다', 'success');
  };

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <button onClick={toggleSidebar} className="rounded-md p-1.5 hover:bg-muted">
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            CF
          </div>
          <span className="text-sm font-semibold">ContentFlow AI</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleSave}>
          <Save size={16} className="mr-1.5" />
          저장
        </Button>
        <Button variant="secondary" size="sm">
          <Download size={16} className="mr-1.5" />
          내보내기
        </Button>
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-foreground hover:bg-muted"
          title={isDark ? '라이트 모드' : '다크 모드'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
