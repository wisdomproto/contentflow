'use client';

import { create } from 'zustand';
import type { TabId } from '@/types/content';

interface UIState {
  activeTab: TabId;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isFolderDrawerOpen: boolean;
  drawerFolderId: string | null;
  previewMode: 'mobile' | 'desktop';

  setActiveTab: (tab: TabId) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  openFolderDrawer: (folderId: string) => void;
  closeFolderDrawer: () => void;
  setPreviewMode: (mode: 'mobile' | 'desktop') => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeTab: 'basic',
  isSidebarOpen: true,
  isRightPanelOpen: true,
  isFolderDrawerOpen: false,
  drawerFolderId: null,
  previewMode: 'mobile',

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  openFolderDrawer: (folderId) => set({ isFolderDrawerOpen: true, drawerFolderId: folderId }),
  closeFolderDrawer: () => set({ isFolderDrawerOpen: false, drawerFolderId: null }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
}));
