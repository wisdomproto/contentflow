'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ContentContext, BlogSection, Source, ContentStatus, GeminiModel, ImageModel, ModelSettings } from '@/types/content';
import type { Slide, SlideType, CardNewsData } from '@/types/card-news';
import { DEFAULT_MODEL_SETTINGS, DEFAULT_IMAGE_MODEL } from '@/lib/constants';

interface ContentState {
  contents: Record<string, ContentContext>;
  activeContentId: string | null;

  createContent: (folderId: string | null) => string;
  deleteContent: (id: string) => void;
  setActiveContent: (id: string | null) => void;
  setContentStatus: (id: string, status: ContentStatus) => void;

  // Source
  updateSource: (id: string, source: Partial<Source>) => void;

  // Blog
  updateBlogTitle: (id: string, title: string) => void;
  updateBlogTags: (id: string, tags: string[]) => void;
  addSection: (id: string, afterSectionId?: string) => void;
  updateSection: (id: string, sectionId: string, data: Partial<BlogSection>) => void;
  deleteSection: (id: string, sectionId: string) => void;
  reorderSections: (id: string, sectionIds: string[]) => void;

  // Bulk blog update (for AI generation)
  setBlogData: (id: string, title: string, sections: BlogSection[], tags: string[]) => void;

  // Card News
  setCardNewsData: (id: string, data: CardNewsData) => void;
  updateCardNewsSettings: (id: string, settings: Partial<Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>>) => void;
  addSlide: (id: string, afterSlideId?: string) => void;
  updateSlide: (id: string, slideId: string, data: Partial<Slide>) => void;
  deleteSlide: (id: string, slideId: string) => void;
  reorderSlides: (id: string, slideIds: string[]) => void;
  duplicateSlide: (id: string, slideId: string) => void;

  // Model settings
  updateModelSettings: (id: string, tab: keyof ModelSettings, model: GeminiModel) => void;
  updateImageModel: (id: string, model: ImageModel) => void;
}

function createEmptySlide(type: SlideType = 'body'): Slide {
  return {
    id: nanoid(),
    type,
    headline: '',
    body: '',
    imageUrl: null,
    imagePlaceholder: '',
  };
}

function createDefaultCardNews(): CardNewsData {
  return {
    slides: [createEmptySlide('cover'), createEmptySlide('body'), createEmptySlide('outro')],
    template: 'minimal',
    colorTheme: 'white',
    font: 'pretendard',
    ratio: '1:1',
  };
}

function createEmptySection(type: BlogSection['type'] = 'body'): BlogSection {
  return {
    id: nanoid(),
    type,
    header: '',
    imageUrl: null,
    imagePlaceholder: '',
    text: '',
    isCollapsed: false,
  };
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      contents: {},
      activeContentId: null,

      createContent: (folderId) => {
        const id = nanoid();
        const content: ContentContext = {
          id,
          folderId,
          status: 'draft',
          source: {
            topic: '',
            keywords: [],
            tone: '',
            insights: '',
            referenceUrls: [],
          },
          blog: {
            title: '',
            sections: [createEmptySection('intro')],
            tags: [],
          },
          cardnews: null,
          video: null,
          modelSettings: { ...DEFAULT_MODEL_SETTINGS },
          imageModel: DEFAULT_IMAGE_MODEL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ contents: { ...s.contents, [id]: content } }));
        return id;
      },

      deleteContent: (id) =>
        set((s) => {
          const rest = Object.fromEntries(
            Object.entries(s.contents).filter(([key]) => key !== id),
          );
          return {
            contents: rest,
            activeContentId: s.activeContentId === id ? null : s.activeContentId,
          };
        }),

      setActiveContent: (id) => set({ activeContentId: id }),

      setContentStatus: (id, status) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: { ...s.contents[id], status, updatedAt: new Date().toISOString() },
          },
        })),

      updateSource: (id, source) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              source: { ...s.contents[id].source, ...source },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateBlogTitle: (id, title) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              blog: { ...s.contents[id].blog, title },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateBlogTags: (id, tags) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              blog: { ...s.contents[id].blog, tags },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      addSection: (id, afterSectionId) =>
        set((s) => {
          const content = s.contents[id];
          const newSection = createEmptySection('body');
          const sections = [...content.blog.sections];

          if (afterSectionId) {
            const idx = sections.findIndex((sec) => sec.id === afterSectionId);
            sections.splice(idx + 1, 0, newSection);
          } else {
            sections.push(newSection);
          }

          return {
            contents: {
              ...s.contents,
              [id]: {
                ...content,
                blog: { ...content.blog, sections },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      updateSection: (id, sectionId, data) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              blog: {
                ...s.contents[id].blog,
                sections: s.contents[id].blog.sections.map((sec) =>
                  sec.id === sectionId ? { ...sec, ...data } : sec,
                ),
              },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      deleteSection: (id, sectionId) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              blog: {
                ...s.contents[id].blog,
                sections: s.contents[id].blog.sections.filter((sec) => sec.id !== sectionId),
              },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      reorderSections: (id, sectionIds) =>
        set((s) => {
          const content = s.contents[id];
          const sectionMap = new Map(content.blog.sections.map((sec) => [sec.id, sec]));
          const reordered = sectionIds
            .map((sid) => sectionMap.get(sid))
            .filter(Boolean) as BlogSection[];

          return {
            contents: {
              ...s.contents,
              [id]: {
                ...content,
                blog: { ...content.blog, sections: reordered },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      setBlogData: (id, title, sections, tags) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              blog: { title, sections, tags },
              status: 'generated' as ContentStatus,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      setCardNewsData: (id, data) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              cardnews: data,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateCardNewsSettings: (id, settings) =>
        set((s) => {
          const cn = s.contents[id].cardnews ?? createDefaultCardNews();
          return {
            contents: {
              ...s.contents,
              [id]: {
                ...s.contents[id],
                cardnews: { ...cn, ...settings },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      addSlide: (id, afterSlideId) =>
        set((s) => {
          const content = s.contents[id];
          const cn = content.cardnews ?? createDefaultCardNews();
          const newSlide = createEmptySlide('body');
          const slides = [...cn.slides];

          if (afterSlideId) {
            const idx = slides.findIndex((sl) => sl.id === afterSlideId);
            slides.splice(idx + 1, 0, newSlide);
          } else {
            slides.push(newSlide);
          }

          return {
            contents: {
              ...s.contents,
              [id]: {
                ...content,
                cardnews: { ...cn, slides },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      updateSlide: (id, slideId, data) =>
        set((s) => {
          const cn = s.contents[id].cardnews;
          if (!cn) return s;
          return {
            contents: {
              ...s.contents,
              [id]: {
                ...s.contents[id],
                cardnews: {
                  ...cn,
                  slides: cn.slides.map((sl) =>
                    sl.id === slideId ? { ...sl, ...data } : sl,
                  ),
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      deleteSlide: (id, slideId) =>
        set((s) => {
          const cn = s.contents[id].cardnews;
          if (!cn) return s;
          return {
            contents: {
              ...s.contents,
              [id]: {
                ...s.contents[id],
                cardnews: {
                  ...cn,
                  slides: cn.slides.filter((sl) => sl.id !== slideId),
                },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      reorderSlides: (id, slideIds) =>
        set((s) => {
          const cn = s.contents[id].cardnews;
          if (!cn) return s;
          const slideMap = new Map(cn.slides.map((sl) => [sl.id, sl]));
          const reordered = slideIds
            .map((sid) => slideMap.get(sid))
            .filter(Boolean) as Slide[];
          return {
            contents: {
              ...s.contents,
              [id]: {
                ...s.contents[id],
                cardnews: { ...cn, slides: reordered },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      duplicateSlide: (id, slideId) =>
        set((s) => {
          const cn = s.contents[id].cardnews;
          if (!cn) return s;
          const idx = cn.slides.findIndex((sl) => sl.id === slideId);
          if (idx === -1) return s;
          const original = cn.slides[idx];
          const copy: Slide = { ...original, id: nanoid(), imageUrl: null };
          const slides = [...cn.slides];
          slides.splice(idx + 1, 0, copy);
          return {
            contents: {
              ...s.contents,
              [id]: {
                ...s.contents[id],
                cardnews: { ...cn, slides },
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      updateModelSettings: (id, tab, model) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              modelSettings: { ...s.contents[id].modelSettings, [tab]: model },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateImageModel: (id, model) =>
        set((s) => ({
          contents: {
            ...s.contents,
            [id]: {
              ...s.contents[id],
              imageModel: model,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
    }),
    { name: 'contentflow-contents' },
  ),
);
