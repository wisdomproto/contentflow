'use client';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainEditor } from './MainEditor';
import { RightPanel } from './RightPanel';
import { FolderSettingsDrawer } from '@/components/sidebar/FolderSettingsDrawer';

export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar />
        <MainEditor />
        <RightPanel />
        <FolderSettingsDrawer />
      </div>
    </div>
  );
}
