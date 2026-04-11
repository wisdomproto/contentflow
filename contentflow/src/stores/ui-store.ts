import { create } from 'zustand'

interface UIState {
  selectedProjectId: string | null
  selectedContentId: string | null
  sidebarCollapsed: boolean
  showProjectSettings: boolean
  showStrategy: boolean
  showAnalytics: boolean
  searchQuery: string
  filterStatus: string
  sortBy: 'name' | 'date'
  sortOrder: 'asc' | 'desc'
  selectedLanguage: string

  selectProject: (id: string | null) => void
  selectContent: (id: string | null) => void
  toggleSidebar: () => void
  setShowProjectSettings: (show: boolean) => void
  setShowStrategy: (show: boolean) => void
  setShowAnalytics: (show: boolean) => void
  setSearchQuery: (query: string) => void
  setFilterStatus: (status: string) => void
  setSortBy: (sort: 'name' | 'date') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  setSelectedLanguage: (lang: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedProjectId: null,
  selectedContentId: null,
  sidebarCollapsed: false,
  showProjectSettings: false,
  showStrategy: false,
  showAnalytics: false,
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
  selectedLanguage: 'ko',

  selectProject: (id) => set({ selectedProjectId: id, selectedContentId: null, showProjectSettings: false }),
  selectContent: (id) => set({ selectedContentId: id, showProjectSettings: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setShowProjectSettings: (show) => set({ showProjectSettings: show }),
  setShowStrategy: (show) => set({ showStrategy: show }),
  setShowAnalytics: (show) => set({ showAnalytics: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
}))
