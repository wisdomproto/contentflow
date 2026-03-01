'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Folder, FolderSettings, Persona } from '@/types/folder';
import { DEFAULT_PERSONA, FOLDER_COLORS } from '@/lib/constants';

interface FolderState {
  folders: Folder[];
  activeFolderId: string | null;

  createFolder: (name: string) => string;
  updateFolderSettings: (id: string, settings: Partial<FolderSettings>) => void;
  updatePersona: (id: string, persona: Partial<Persona>) => void;
  deleteFolder: (id: string) => void;
  setActiveFolder: (id: string | null) => void;
  toggleFolderExpand: (id: string) => void;
  addContentToFolder: (folderId: string, contentId: string) => void;
  removeContentFromFolder: (folderId: string, contentId: string) => void;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set, get) => ({
      folders: [],
      activeFolderId: null,

      createFolder: (name: string) => {
        const id = nanoid();
        const colorIndex = get().folders.length % FOLDER_COLORS.length;
        const folder: Folder = {
          id,
          settings: {
            name,
            color: FOLDER_COLORS[colorIndex],
            icon: '📁',
            naverCategory: '',
            mainKeywords: [],
            seriesEnabled: false,
            seriesTitle: '',
            seriesCount: 0,
          },
          persona: { ...DEFAULT_PERSONA },
          contentIds: [],
          isExpanded: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ folders: [...s.folders, folder] }));
        return id;
      },

      updateFolderSettings: (id, settings) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id
              ? { ...f, settings: { ...f.settings, ...settings }, updatedAt: new Date().toISOString() }
              : f,
          ),
        })),

      updatePersona: (id, persona) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id
              ? { ...f, persona: { ...f.persona, ...persona }, updatedAt: new Date().toISOString() }
              : f,
          ),
        })),

      deleteFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          activeFolderId: s.activeFolderId === id ? null : s.activeFolderId,
        })),

      setActiveFolder: (id) => set({ activeFolderId: id }),

      toggleFolderExpand: (id) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id ? { ...f, isExpanded: !f.isExpanded } : f,
          ),
        })),

      addContentToFolder: (folderId, contentId) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === folderId
              ? { ...f, contentIds: [...f.contentIds, contentId] }
              : f,
          ),
        })),

      removeContentFromFolder: (folderId, contentId) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === folderId
              ? { ...f, contentIds: f.contentIds.filter((cid) => cid !== contentId) }
              : f,
          ),
        })),
    }),
    { name: 'contentflow-folders' },
  ),
);
