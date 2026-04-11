'use client';

import { Header } from '@/components/layout/header';
import { ProjectTree } from '@/components/sidebar/project-tree';
import { useHydration } from '@/hooks/use-hydration';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-60 border-r border-border" />
          <main className="flex-1 flex flex-col overflow-hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <ProjectTree />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
