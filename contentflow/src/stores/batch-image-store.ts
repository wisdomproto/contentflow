import { create } from 'zustand'
import { convertToWebpBlob, uploadToR2 } from '@/hooks/use-r2-upload'
import { useProjectStore } from './project-store'

export interface BatchJobProgress {
  current: number
  total: number
  currentSlideIndex: number
  isRunning: boolean
}

interface BatchState {
  jobs: Record<string, BatchJobProgress>
  controllers: Record<string, AbortController>
  startJob: (args: {
    igContentId: string
    prompts: { prompt: string; aspectRatio: string; slideIndex: number }[]
    imageModel: string
    projectId: string
  }) => Promise<void>
  abortJob: (igContentId: string) => void
  getJob: (igContentId: string) => BatchJobProgress | undefined
}

const EMPTY: BatchJobProgress = {
  current: 0,
  total: 0,
  currentSlideIndex: -1,
  isRunning: false,
}

export const useBatchImageStore = create<BatchState>()((set, get) => ({
  jobs: {},
  controllers: {},

  getJob: (igContentId) => get().jobs[igContentId],

  startJob: async ({ igContentId, prompts, imageModel, projectId }) => {
    if (get().jobs[igContentId]?.isRunning) return

    const controller = new AbortController()
    set((s) => ({
      jobs: {
        ...s.jobs,
        [igContentId]: {
          current: 0,
          total: prompts.length,
          currentSlideIndex: -1,
          isRunning: true,
        },
      },
      controllers: { ...s.controllers, [igContentId]: controller },
    }))

    const updateProgress = (patch: Partial<BatchJobProgress>) => {
      set((s) => {
        const existing = s.jobs[igContentId]
        if (!existing) return s
        return { jobs: { ...s.jobs, [igContentId]: { ...existing, ...patch } } }
      })
    }

    for (let i = 0; i < prompts.length; i++) {
      if (controller.signal.aborted) break
      const p = prompts[i]
      updateProgress({ current: i, currentSlideIndex: p.slideIndex })

      try {
        const res = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: p.prompt,
            model: imageModel,
            aspectRatio: p.aspectRatio,
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          console.warn(`[batch] Slide ${i + 1} HTTP ${res.status}`)
          continue
        }
        const data = await res.json()
        if (!data?.image) continue

        const store = useProjectStore.getState()
        const cards = store.getInstagramCards(igContentId)
        const card = cards[p.slideIndex]
        if (!card) continue

        let savedUrl = `data:${data.mimeType};base64,${data.image}`
        try {
          const { blob, mimeType } = await convertToWebpBlob(data.image, data.mimeType)
          const ext = mimeType.split('/')[1] || 'webp'
          const { publicUrl } = await uploadToR2(blob, {
            projectId,
            category: 'images',
            fileName: `${card.id}.${ext}`,
            contentType: mimeType,
            contentId: card.id,
          })
          savedUrl = publicUrl
        } catch {
          /* keep data URL fallback */
        }

        store.updateInstagramCard(card.id, { background_image_url: savedUrl })
      } catch (err) {
        if ((err as Error).name === 'AbortError') break
        console.warn(`[batch] Slide ${i + 1} error:`, (err as Error).message)
      }
    }

    updateProgress({
      current: prompts.length,
      currentSlideIndex: -1,
      isRunning: false,
    })

    // Cleanup shortly after completion.
    setTimeout(() => {
      set((s) => {
        if (s.jobs[igContentId]?.isRunning) return s
        const { [igContentId]: _removed, ...rest } = s.jobs
        const { [igContentId]: _c, ...restCtrls } = s.controllers
        void _removed
        void _c
        return { jobs: rest, controllers: restCtrls }
      })
    }, 3000)
  },

  abortJob: (igContentId) => {
    const ctrl = get().controllers[igContentId]
    ctrl?.abort()
    set((s) => {
      const { [igContentId]: _removed, ...rest } = s.jobs
      const { [igContentId]: _c, ...restCtrls } = s.controllers
      void _removed
      void _c
      return { jobs: rest, controllers: restCtrls }
    })
  },
}))

export function selectBatchProgress(igContentId: string) {
  return (s: BatchState): BatchJobProgress => s.jobs[igContentId] ?? EMPTY
}
