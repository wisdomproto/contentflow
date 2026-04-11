'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Search, Bell, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className={cn(
      'h-14 border-b flex items-center justify-between px-4',
      'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
          ContentFlow
        </span>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        )}>
          <Search size={16} />
          <input
            type="text"
            placeholder="검색..."
            className="bg-transparent outline-none text-sm flex-1 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="테마 전환"
        >
          {mounted ? (theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} />}
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <User size={18} />
        </button>
      </div>
    </header>
  );
}
