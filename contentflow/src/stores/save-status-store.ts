import { create } from 'zustand'

export interface SaveStatusState {
  /** Number of distinct (table, id) writes queued or in-flight. */
  pending: number
  /** True while the flush loop is actively posting to Supabase. */
  flushing: boolean
  /** Last error message — cleared on the next successful flush. */
  lastError: string | null
  /** Last successful flush timestamp (ms since epoch). */
  lastSavedAt: number | null
  _increment: () => void
  _decrement: (n?: number) => void
  _setFlushing: (flushing: boolean) => void
  _setError: (msg: string | null) => void
  _setSavedAt: (ts: number) => void
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  pending: 0,
  flushing: false,
  lastError: null,
  lastSavedAt: null,
  _increment: () => set((s) => ({ pending: s.pending + 1 })),
  _decrement: (n = 1) => set((s) => ({ pending: Math.max(0, s.pending - n) })),
  _setFlushing: (flushing) => set({ flushing }),
  _setError: (msg) => set({ lastError: msg }),
  _setSavedAt: (ts) => set({ lastSavedAt: ts, lastError: null }),
}))
