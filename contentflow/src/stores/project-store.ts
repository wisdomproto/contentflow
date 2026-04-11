import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Project, Content, ContentStatus, BaseArticle, BlogContent, BlogCard, InstagramContent, InstagramCard, ThreadsContent, ThreadsCard, YoutubeContent, YoutubeCard } from '@/types/database';
import type { MarketingStrategy, StrategyInput, GenerationStatus, StrategyTab } from '@/types/strategy';
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from '@/lib/ai-models';
import type { ImportedStrategy } from '@/types/analytics';
import { generateId } from '@/lib/utils';

// IndexedDB storage adapter (localStorage 5MB 제한 해결)
const idbStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    return (await idbGet(name)) ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
}));

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  selectedContentId: string | null;
  contents: Content[];
  baseArticles: BaseArticle[];
  blogContents: BlogContent[];
  blogCards: BlogCard[];
  instagramContents: InstagramContent[];
  instagramCards: InstagramCard[];
  threadsContents: ThreadsContent[];
  threadsCards: ThreadsCard[];
  youtubeContents: YoutubeContent[];
  youtubeCards: YoutubeCard[];
  sidebarCollapsed: boolean;
  showProjectSettings: boolean;
  showStrategy: boolean;
  showAnalytics: boolean;
  openAnalytics: (projectId: string) => void;
  setShowAnalytics: (show: boolean) => void;
  searchQuery: string;
  filterStatus: ContentStatus | 'all';
  sortBy: 'name' | 'date';
  sortOrder: 'asc' | 'desc';

  // Basic setters
  setProjects: (projects: Project[]) => void;
  selectProject: (projectId: string | null) => void;
  selectContent: (contentId: string | null) => void;
  setContents: (contents: Content[]) => void;
  setBaseArticles: (articles: BaseArticle[]) => void;
  setBlogContents: (blogContents: BlogContent[]) => void;
  setBlogCards: (blogCards: BlogCard[]) => void;
  setInstagramContents: (instagramContents: InstagramContent[]) => void;
  setInstagramCards: (instagramCards: InstagramCard[]) => void;
  setThreadsContents: (threadsContents: ThreadsContent[]) => void;
  setThreadsCards: (threadsCards: ThreadsCard[]) => void;
  setYoutubeContents: (youtubeContents: YoutubeContent[]) => void;
  setYoutubeCards: (youtubeCards: YoutubeCard[]) => void;
  toggleSidebar: () => void;

  // Project CRUD
  createProject: (data: { name: string; description?: string }) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  duplicateProject: (projectId: string) => void;

  // Content CRUD
  createContent: (data: { project_id: string; title: string; category?: string; tags?: string[] }) => void;
  updateContent: (contentId: string, updates: Partial<Content>) => void;
  deleteContent: (contentId: string) => void;

  // BaseArticle CRUD
  createOrUpdateBaseArticle: (contentId: string, data: Partial<BaseArticle>) => void;
  getBaseArticle: (contentId: string) => BaseArticle | undefined;

  // BlogContent CRUD (1:N — 하나의 Content에 여러 BlogContent)
  addBlogContent: (contentId: string, data?: Partial<BlogContent>) => string;
  updateBlogContent: (blogContentId: string, updates: Partial<BlogContent>) => void;
  deleteBlogContent: (blogContentId: string) => void;
  getBlogContents: (contentId: string) => BlogContent[];
  getBlogCards: (blogContentId: string) => BlogCard[];
  setBlogCardsForContent: (blogContentId: string, cards: BlogCard[]) => void;
  addBlogCard: (blogContentId: string, cardType: BlogCard['card_type'], sortOrder: number) => void;
  updateBlogCard: (cardId: string, updates: Partial<BlogCard>) => void;
  deleteBlogCard: (cardId: string) => void;
  reorderBlogCards: (blogContentId: string, cardIds: string[]) => void;

  // InstagramContent CRUD (1:N)
  addInstagramContent: (contentId: string, data?: Partial<InstagramContent>) => string;
  updateInstagramContent: (igContentId: string, updates: Partial<InstagramContent>) => void;
  deleteInstagramContent: (igContentId: string) => void;
  getInstagramContents: (contentId: string) => InstagramContent[];
  getInstagramCards: (instagramContentId: string) => InstagramCard[];
  setInstagramCardsForContent: (instagramContentId: string, cards: InstagramCard[]) => void;
  addInstagramCard: (instagramContentId: string, sortOrder: number) => void;
  updateInstagramCard: (cardId: string, updates: Partial<InstagramCard>) => void;
  deleteInstagramCard: (cardId: string) => void;
  reorderInstagramCards: (instagramContentId: string, cardIds: string[]) => void;

  // ThreadsContent CRUD (1:N)
  addThreadsContent: (contentId: string, data?: Partial<ThreadsContent>) => string;
  updateThreadsContent: (threadsContentId: string, updates: Partial<ThreadsContent>) => void;
  deleteThreadsContent: (threadsContentId: string) => void;
  getThreadsContents: (contentId: string) => ThreadsContent[];
  getThreadsCards: (threadsContentId: string) => ThreadsCard[];
  setThreadsCardsForContent: (threadsContentId: string, cards: ThreadsCard[]) => void;
  addThreadsCard: (threadsContentId: string, sortOrder: number) => void;
  updateThreadsCard: (cardId: string, updates: Partial<ThreadsCard>) => void;
  deleteThreadsCard: (cardId: string) => void;
  reorderThreadsCards: (threadsContentId: string, cardIds: string[]) => void;

  // YoutubeContent CRUD (1:N)
  addYoutubeContent: (contentId: string, data?: Partial<YoutubeContent>) => string;
  updateYoutubeContent: (ytContentId: string, updates: Partial<YoutubeContent>) => void;
  deleteYoutubeContent: (ytContentId: string) => void;
  getYoutubeContents: (contentId: string) => YoutubeContent[];
  getYoutubeCards: (youtubeContentId: string) => YoutubeCard[];
  setYoutubeCardsForContent: (youtubeContentId: string, cards: YoutubeCard[]) => void;
  addYoutubeCard: (youtubeContentId: string, sortOrder: number) => void;
  updateYoutubeCard: (cardId: string, updates: Partial<YoutubeCard>) => void;
  deleteYoutubeCard: (cardId: string) => void;
  reorderYoutubeCards: (youtubeContentId: string, cardIds: string[]) => void;

  // Strategy
  strategies: MarketingStrategy[];
  getStrategy: (projectId: string) => MarketingStrategy | undefined;
  createOrUpdateStrategy: (projectId: string, input: StrategyInput) => string;
  updateStrategyTab: (strategyId: string, tab: StrategyTab, data: unknown) => void;
  updateStrategyStatus: (strategyId: string, status: Partial<GenerationStatus>) => void;
  deleteStrategy: (projectId: string) => void;
  importStrategy: (projectId: string, data: ImportedStrategy) => void;
  clearImportedStrategy: (projectId: string) => void;
  getImportedStrategy: (projectId: string) => ImportedStrategy | null;

  // Channel model helpers
  getChannelModels: (projectId: string, channel: string) => { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
  setChannelModels: (projectId: string, channel: string, models: { textModel?: string; imageModel?: string; aspectRatio?: string; imageStyle?: string }) => void;

  // UI state
  openProjectSettings: (projectId: string) => void;
  setShowProjectSettings: (show: boolean) => void;
  openStrategy: (projectId: string) => void;
  setShowStrategy: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: ContentStatus | 'all') => void;
  setSortBy: (sortBy: 'name' | 'date') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export const useProjectStore = create<ProjectState>()(persist((set, get) => ({
  projects: [],
  selectedProjectId: null,
  selectedContentId: null,
  contents: [],
  baseArticles: [],
  blogContents: [],
  blogCards: [],
  instagramContents: [],
  instagramCards: [],
  threadsContents: [],
  threadsCards: [],
  youtubeContents: [],
  youtubeCards: [],
  strategies: [],
  sidebarCollapsed: false,
  showProjectSettings: false,
  showStrategy: false,
  showAnalytics: false,
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'name',
  sortOrder: 'asc',

  setProjects: (projects) => set({ projects }),
  selectProject: (projectId) =>
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: false, showAnalytics: false }),
  selectContent: (contentId) => {
    if (contentId) {
      const content = get().contents.find(c => c.id === contentId);
      set({
        selectedContentId: contentId,
        selectedProjectId: content?.project_id ?? get().selectedProjectId,
        showProjectSettings: false,
        showStrategy: false,
        showAnalytics: false,
      });
    } else {
      set({ selectedContentId: null });
    }
  },
  setContents: (contents) => set({ contents }),
  setBaseArticles: (articles) => set({ baseArticles: articles }),
  setBlogContents: (blogContents) => set({ blogContents }),
  setBlogCards: (blogCards) => set({ blogCards }),
  setInstagramContents: (instagramContents) => set({ instagramContents }),
  setInstagramCards: (instagramCards) => set({ instagramCards }),
  setThreadsContents: (threadsContents) => set({ threadsContents }),
  setThreadsCards: (threadsCards) => set({ threadsCards }),
  setYoutubeContents: (youtubeContents) => set({ youtubeContents }),
  setYoutubeCards: (youtubeCards) => set({ youtubeCards }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Project CRUD
  createProject: (data) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: generateId('proj'),
      user_id: 'user-1',
      name: data.name,
      description: data.description ?? null,
      cover_image_url: null,
      industry: null,
      brand_name: null,
      brand_description: null,
      target_audience: null,
      usp: null,
      brand_tone: null,
      banned_keywords: null,
      brand_logo_url: null,
      marketer_name: null,
      marketer_expertise: null,
      marketer_style: null,
      marketer_phrases: null,
      sns_goal: null,
      blog_tone_prompt: null,
      blog_image_style_prompt: null,
      instagram_tone_prompt: null,
      instagram_image_style_prompt: null,
      threads_tone_prompt: null,
      youtube_tone_prompt: null,
      youtube_image_style_prompt: null,
      ai_model_settings: null,
      writing_guide_global: null,
      writing_guide_blog: `# 블로그 글쓰기 가이드 (네이버)

## 말투 & 톤
- 존댓말 기본 ("~해요", "~입니다" 혼용 OK)
- 친근하지만 신뢰감 있는 톤
- 독자에게 말 걸듯이 ("혹시 이런 경험 있으신가요?")
- 전문 용어는 쉽게 풀어서 설명

## 구조
- 도입: 공감/질문/상황 묘사로 시작 (3~4줄)
- 본문: 소제목(H2/H3)으로 섹션 구분, 각 섹션 3~5문단
- 핵심 정보는 굵은 글씨로 강조
- 마무리: 요약 + 행동 유도 (댓글, 공유, 관련 글 링크)

## SEO 포맷
- 제목에 주요 키워드 포함 (앞쪽 배치)
- 소제목에도 키워드 자연스럽게 반영
- 본문 2,000~3,000자 이상 권장
- 이미지 3~5장 삽입 (섹션당 1장)
- 첫 문단 100자 이내에 키워드 1회 포함

## 피해야 할 것
- 키워드 억지 반복 (스팸 느낌)
- "오늘은 ~에 대해 알아보겠습니다"로 시작
- 출처 없는 통계/수치
- 단락 없이 이어지는 장문
- 지나친 광고/홍보 톤`,
      writing_guide_instagram: `# 카드뉴스 글쓰기 가이드 (인스타그램)

## 말투 & 톤
- 해요체 기본 ("~해요", "~이에요")
- 밝고 긍정적인 에너지
- 짧고 임팩트 있게
- 공감 포인트 적극 활용

## 카드 구조
- 표지(1장): 궁금증 유발하는 제목 (10자 이내 권장)
- 본문(3~8장): 1카드 = 1핵심 메시지, 2~3줄 이내
- 마지막(1장): CTA ("저장해두세요!", "팔로우하면 더 많은 팁!")

## 텍스트 포맷
- 카드당 핵심 문장 1~2개
- 숫자/리스트 적극 활용 ("3가지 방법", "Step 1")
- 강조할 단어는 색상/굵기로 구분
- 한 카드에 텍스트 과적재 금지

## 캡션 & 해시태그
- 캡션: 카드 내용 보충 + 스토리텔링 (3~5줄)
- 첫 줄에 훅 ("이거 모르면 손해!")
- 해시태그: 대표 3~5개 + 세부 5~10개 + 커뮤니티 태그
- 줄바꿈으로 해시태그 영역 분리

## 피해야 할 것
- 카드에 글자 빽빽하게 채우기
- 배경과 텍스트 색상 대비 부족
- 캡션 없이 카드만 올리기
- 관련 없는 인기 해시태그 남용`,
      writing_guide_threads: `# 스레드 글쓰기 가이드

## 말투 & 톤
- 반말 + 구어체 기본 ("~임", "~ㅋㅋ", "~인듯", "~아님?")
- 친구한테 카톡하듯 편하게
- 과한 존댓말 ❌ 딱딱한 문어체 ❌
- 적절한 자기비하/셀프디스 유머 OK

## 구조
- 첫 포스트(훅): 한 줄로 궁금증 유발 or 도발적 질문
- 중간: 핵심 정보를 짧게 끊어서 전달 (1포스트 = 1메시지)
- 마지막: CTA or 공감 유도 ("어떻게 생각함?", "나만 그런거 아니지?")

## 포맷
- 한 포스트에 2~4줄 이내
- 줄바꿈 자주 사용 (가독성)
- 이모지는 포인트로만 (1~2개/포스트)
- 해시태그는 마지막 포스트에만, 3~5개
- 리스트/넘버링 가능하지만 심플하게

## 피해야 할 것
- "안녕하세요~" 같은 인사말
- 블로그식 장문
- "오늘은 ~에 대해 알아보겠습니다" 류의 도입부
- 과도한 이모지 도배
- 광고 느낌의 직접적 판매 멘트`,
      writing_guide_youtube: `# 유튜브 대본 글쓰기 가이드

## 말투 & 톤
- 해요체 or 반말 (채널 톤에 맞게)
- 말하듯이 쓰기 — 읽었을 때 자연스러운 호흡
- "자, 그러면", "근데 여기서 중요한 게" 같은 구어 전환어 사용
- 시청자에게 직접 말 걸기 ("여러분도 이런 적 있죠?")

## 대본 구조
- 훅 (0~15초): 영상 핵심 가치를 한 문장으로, 이탈 방지
- 인트로 (15~30초): 주제 소개 + 왜 봐야 하는지
- 본문: 소주제별 섹션 나누기, 섹션마다 전환 멘트
- 예시/사례: 구체적 스토리텔링 (숫자, 이름, 상황)
- 마무리: 핵심 요약 1~2줄 + CTA (구독/좋아요/댓글)

## 나레이션 작성법
- 한 문장 20자 이내 권장 (호흡 단위)
- 긴 설명은 짧은 문장 여러 개로 분리
- 강조 포인트에 [강조] 표시 가능
- 쉬어가는 포인트 ("잠깐, 여기서 퀴즈!")

## 화면 디렉션
- 자막/텍스트: 핵심 키워드나 숫자 강조
- B-roll/이미지: 구체적으로 묘사 ("스마트폰 클로즈업", "그래프 애니메이션")
- 전환 효과: 섹션 전환 시 명시

## 피해야 할 것
- 읽기 어려운 문어체 ("~하였으며", "~것이다")
- 인트로 없이 바로 본론
- 화면 디렉션 없는 나레이션만 작성
- CTA 빠뜨리기
- 한 섹션이 3분 이상 길어지기`,
      api_keys: null,
      reference_files: null,
      bgm_files: null,
      reference_summary: null,
      funnel_config: null,
      ga4_config: null,
      imported_strategy: null,
      sort_order: get().projects.length,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      selectedProjectId: newProject.id,
      selectedContentId: null,
      showProjectSettings: true,
    }));
  },

  updateProject: (projectId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      ),
    }));
  },

  deleteProject: (projectId) => {
    const contentIds = get().contents.filter((c) => c.project_id === projectId).map((c) => c.id);
    const blogContentIds = get().blogContents.filter((bc) => contentIds.includes(bc.content_id)).map((bc) => bc.id);
    const igContentIds = get().instagramContents.filter((ic) => contentIds.includes(ic.content_id)).map((ic) => ic.id);
    const thContentIds = get().threadsContents.filter((tc) => contentIds.includes(tc.content_id)).map((tc) => tc.id);
    const ytContentIds = get().youtubeContents.filter((yc) => contentIds.includes(yc.content_id)).map((yc) => yc.id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      contents: state.contents.filter((c) => c.project_id !== projectId),
      baseArticles: state.baseArticles.filter((a) => !contentIds.includes(a.content_id)),
      blogContents: state.blogContents.filter((bc) => !contentIds.includes(bc.content_id)),
      blogCards: state.blogCards.filter((card) => !blogContentIds.includes(card.blog_content_id)),
      instagramContents: state.instagramContents.filter((ic) => !contentIds.includes(ic.content_id)),
      instagramCards: state.instagramCards.filter((card) => !igContentIds.includes(card.instagram_content_id)),
      threadsContents: state.threadsContents.filter((tc) => !contentIds.includes(tc.content_id)),
      threadsCards: state.threadsCards.filter((card) => !thContentIds.includes(card.threads_content_id)),
      youtubeContents: state.youtubeContents.filter((yc) => !contentIds.includes(yc.content_id)),
      youtubeCards: state.youtubeCards.filter((card) => !ytContentIds.includes(card.youtube_content_id)),
      strategies: state.strategies.filter((s) => s.projectId !== projectId),
      selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
      selectedContentId:
        state.contents.find((c) => c.id === state.selectedContentId)?.project_id === projectId
          ? null
          : state.selectedContentId,
      showProjectSettings: state.selectedProjectId === projectId ? false : state.showProjectSettings,
    }));
    // Async R2 cleanup (fire-and-forget)
    fetch('/api/storage/delete-prefix', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: `${projectId}/` }),
    }).catch(() => {
      // R2 cleanup failure is non-blocking
    });
  },

  duplicateProject: (projectId) => {
    const { projects, contents } = get();
    const original = projects.find((p) => p.id === projectId);
    if (!original) return;

    const now = new Date().toISOString();
    const newProjectId = generateId('proj');
    const duplicated: Project = {
      ...original,
      id: newProjectId,
      name: `${original.name} (복사)`,
      sort_order: projects.length,
      created_at: now,
      updated_at: now,
    };

    const originalContents = contents.filter((c) => c.project_id === projectId);
    const duplicatedContents: Content[] = originalContents.map((c) => ({
      ...c,
      id: generateId('cont'),
      project_id: newProjectId,
      created_at: now,
      updated_at: now,
    }));

    set((state) => ({
      projects: [...state.projects, duplicated],
      contents: [...state.contents, ...duplicatedContents],
    }));
  },

  // Content CRUD
  createContent: (data) => {
    const now = new Date().toISOString();
    const newContent: Content = {
      id: generateId('cont'),
      project_id: data.project_id,
      user_id: 'user-1',
      title: data.title,
      category: data.category ?? null,
      tags: data.tags ?? null,
      memo: null,
      topic: null,
      status: 'draft',
      ai_model_settings: null,
      sort_order: get().contents.filter((c) => c.project_id === data.project_id).length,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({
      contents: [...state.contents, newContent],
      selectedContentId: newContent.id,
      selectedProjectId: data.project_id,
      showProjectSettings: false,
    }));
  },

  updateContent: (contentId, updates) => {
    set((state) => ({
      contents: state.contents.map((c) =>
        c.id === contentId
          ? { ...c, ...updates, updated_at: new Date().toISOString() }
          : c
      ),
    }));
  },

  deleteContent: (contentId) => {
    const state = get();
    const blogContentIds = state.blogContents.filter((bc) => bc.content_id === contentId).map((bc) => bc.id);
    const igContentIds = state.instagramContents.filter((ic) => ic.content_id === contentId).map((ic) => ic.id);
    const thContentIds = state.threadsContents.filter((tc) => tc.content_id === contentId).map((tc) => tc.id);
    const ytContentIds = state.youtubeContents.filter((yc) => yc.content_id === contentId).map((yc) => yc.id);

    // Collect R2 image URLs from cards about to be deleted
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
    const imageUrls: string[] = [];

    // Blog cards: images may be in content field
    state.blogCards
      .filter((c) => blogContentIds.includes(c.blog_content_id))
      .forEach((c) => {
        const imgUrl = (c.content as Record<string, unknown>)?.image_url;
        if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) imageUrls.push(imgUrl);
      });

    // Instagram cards
    state.instagramCards
      .filter((c) => igContentIds.includes(c.instagram_content_id))
      .forEach((c) => { if (c.background_image_url?.startsWith('http')) imageUrls.push(c.background_image_url); });

    // Threads cards
    state.threadsCards
      .filter((c) => thContentIds.includes(c.threads_content_id))
      .forEach((c) => { if (c.media_url?.startsWith('http')) imageUrls.push(c.media_url); });

    // YouTube cards
    state.youtubeCards
      .filter((c) => ytContentIds.includes(c.youtube_content_id))
      .forEach((c) => { if (c.image_url?.startsWith('http')) imageUrls.push(c.image_url); });

    set((s) => ({
      contents: s.contents.filter((c) => c.id !== contentId),
      baseArticles: s.baseArticles.filter((a) => a.content_id !== contentId),
      blogContents: s.blogContents.filter((bc) => bc.content_id !== contentId),
      blogCards: s.blogCards.filter((card) => !blogContentIds.includes(card.blog_content_id)),
      instagramContents: s.instagramContents.filter((ic) => ic.content_id !== contentId),
      instagramCards: s.instagramCards.filter((card) => !igContentIds.includes(card.instagram_content_id)),
      threadsContents: s.threadsContents.filter((tc) => tc.content_id !== contentId),
      threadsCards: s.threadsCards.filter((card) => !thContentIds.includes(card.threads_content_id)),
      youtubeContents: s.youtubeContents.filter((yc) => yc.content_id !== contentId),
      youtubeCards: s.youtubeCards.filter((card) => !ytContentIds.includes(card.youtube_content_id)),
      selectedContentId: s.selectedContentId === contentId ? null : s.selectedContentId,
    }));

    // Async R2 cleanup
    if (imageUrls.length > 0 && r2PublicUrl) {
      const keys = imageUrls
        .filter((url) => url.startsWith(r2PublicUrl))
        .map((url) => url.slice(r2PublicUrl.length + 1));

      if (keys.length > 0) {
        fetch('/api/storage/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys }),
        }).catch(() => {});
      }
    }
  },

  // BaseArticle CRUD
  createOrUpdateBaseArticle: (contentId, data) => {
    set((state) => {
      const existing = state.baseArticles.find((a) => a.content_id === contentId);
      if (existing) {
        return {
          baseArticles: state.baseArticles.map((a) =>
            a.content_id === contentId
              ? { ...a, ...data, updated_at: new Date().toISOString() }
              : a
          ),
        };
      }
      const now = new Date().toISOString();
      const newArticle: BaseArticle = {
        id: generateId('ba'),
        content_id: contentId,
        title: data.title ?? null,
        body: data.body ?? '',
        body_plain_text: data.body_plain_text ?? null,
        word_count: data.word_count ?? 0,
        factcheck_status: null,
        factcheck_score: null,
        factcheck_report: null,
        prompt_used: data.prompt_used ?? null,
        created_at: now,
        updated_at: now,
      };
      return { baseArticles: [...state.baseArticles, newArticle] };
    });
  },

  getBaseArticle: (contentId) => {
    return get().baseArticles.find((a) => a.content_id === contentId);
  },

  // BlogContent CRUD (1:N)
  addBlogContent: (contentId, data) => {
    const now = new Date().toISOString();
    const count = get().blogContents.filter((bc) => bc.content_id === contentId).length;
    const id = generateId('blog');
    const newBlogContent: BlogContent = {
      id,
      content_id: contentId,
      title: data?.title ?? `블로그 글 ${count + 1}`,
      seo_title: data?.seo_title ?? null,
      seo_score: null,
      seo_details: null,
      naver_keywords: null,
      status: 'draft',
      published_url: null,
      published_at: null,
      created_at: now,
      updated_at: now,
      ...data,
    };
    set((state) => ({ blogContents: [...state.blogContents, newBlogContent] }));
    return id;
  },

  updateBlogContent: (blogContentId, updates) => {
    set((state) => ({
      blogContents: state.blogContents.map((bc) =>
        bc.id === blogContentId
          ? { ...bc, ...updates, updated_at: new Date().toISOString() }
          : bc
      ),
    }));
  },

  deleteBlogContent: (blogContentId) => {
    set((state) => ({
      blogContents: state.blogContents.filter((bc) => bc.id !== blogContentId),
      blogCards: state.blogCards.filter((card) => card.blog_content_id !== blogContentId),
    }));
  },

  getBlogContents: (contentId) => {
    return get().blogContents
      .filter((bc) => bc.content_id === contentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  getBlogCards: (blogContentId) => {
    return get().blogCards
      .filter((card) => card.blog_content_id === blogContentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  setBlogCardsForContent: (blogContentId, cards) => {
    set((state) => ({
      blogCards: [
        ...state.blogCards.filter((c) => c.blog_content_id !== blogContentId),
        ...cards,
      ],
    }));
  },

  addBlogCard: (blogContentId, cardType, sortOrder) => {
    const now = new Date().toISOString();
    const defaultContent: Record<string, unknown> =
      cardType === 'text' ? { text: '' }
      : cardType === 'image' ? { url: '', alt: '', caption: '', image_prompt: '', image_style: '' }
      : cardType === 'quote' ? { text: '', author: '' }
      : cardType === 'list' ? { items: [''], ordered: false }
      : {};
    const newCard: BlogCard = {
      id: generateId('bc'),
      blog_content_id: blogContentId,
      card_type: cardType,
      content: defaultContent,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ blogCards: [...state.blogCards, newCard] }));
  },

  updateBlogCard: (cardId, updates) => {
    set((state) => ({
      blogCards: state.blogCards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updated_at: new Date().toISOString() }
          : card
      ),
    }));
  },

  deleteBlogCard: (cardId) => {
    set((state) => ({
      blogCards: state.blogCards.filter((card) => card.id !== cardId),
    }));
  },

  reorderBlogCards: (blogContentId, cardIds) => {
    set((state) => ({
      blogCards: state.blogCards.map((card) => {
        if (card.blog_content_id !== blogContentId) return card;
        const newOrder = cardIds.indexOf(card.id);
        return newOrder >= 0 ? { ...card, sort_order: newOrder } : card;
      }),
    }));
  },

  // InstagramContent CRUD (1:N)
  addInstagramContent: (contentId, data) => {
    const now = new Date().toISOString();
    const count = get().instagramContents.filter((ic) => ic.content_id === contentId).length;
    const id = generateId('ig');
    const newIgContent: InstagramContent = {
      id,
      content_id: contentId,
      title: data?.title ?? `카드뉴스 ${count + 1}`,
      caption: data?.caption ?? null,
      hashtags: data?.hashtags ?? null,
      content_type: data?.content_type ?? 'carousel',
      video_settings: null,
      status: 'draft',
      published_url: null,
      published_at: null,
      created_at: now,
      updated_at: now,
      ...data,
    };
    set((state) => ({ instagramContents: [...state.instagramContents, newIgContent] }));
    return id;
  },

  updateInstagramContent: (igContentId, updates) => {
    set((state) => ({
      instagramContents: state.instagramContents.map((ic) =>
        ic.id === igContentId
          ? { ...ic, ...updates, updated_at: new Date().toISOString() }
          : ic
      ),
    }));
  },

  deleteInstagramContent: (igContentId) => {
    set((state) => ({
      instagramContents: state.instagramContents.filter((ic) => ic.id !== igContentId),
      instagramCards: state.instagramCards.filter((card) => card.instagram_content_id !== igContentId),
    }));
  },

  getInstagramContents: (contentId) => {
    return get().instagramContents
      .filter((ic) => ic.content_id === contentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  getInstagramCards: (instagramContentId) => {
    return get().instagramCards
      .filter((card) => card.instagram_content_id === instagramContentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  setInstagramCardsForContent: (instagramContentId, cards) => {
    set((state) => ({
      instagramCards: [
        ...state.instagramCards.filter((c) => c.instagram_content_id !== instagramContentId),
        ...cards,
      ],
    }));
  },

  addInstagramCard: (instagramContentId, sortOrder) => {
    const now = new Date().toISOString();
    const newCard: InstagramCard = {
      id: generateId('ic'),
      instagram_content_id: instagramContentId,
      text_content: '',
      background_color: '#1a1a2e',
      background_image_url: null,
      text_style: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#ffffff' },
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ instagramCards: [...state.instagramCards, newCard] }));
  },

  updateInstagramCard: (cardId, updates) => {
    set((state) => ({
      instagramCards: state.instagramCards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updated_at: new Date().toISOString() }
          : card
      ),
    }));
  },

  deleteInstagramCard: (cardId) => {
    set((state) => ({
      instagramCards: state.instagramCards.filter((card) => card.id !== cardId),
    }));
  },

  reorderInstagramCards: (instagramContentId, cardIds) => {
    set((state) => ({
      instagramCards: state.instagramCards.map((card) => {
        if (card.instagram_content_id !== instagramContentId) return card;
        const newOrder = cardIds.indexOf(card.id);
        return newOrder >= 0 ? { ...card, sort_order: newOrder } : card;
      }),
    }));
  },

  // ThreadsContent CRUD (1:N)
  addThreadsContent: (contentId, data) => {
    const now = new Date().toISOString();
    const count = get().threadsContents.filter((tc) => tc.content_id === contentId).length;
    const id = generateId('th');
    const newTC: ThreadsContent = {
      id,
      content_id: contentId,
      title: data?.title ?? `스레드 ${count + 1}`,
      thread_type: data?.thread_type ?? 'multi',
      status: 'draft',
      published_url: null,
      published_at: null,
      created_at: now,
      updated_at: now,
      ...data,
    };
    set((state) => ({ threadsContents: [...state.threadsContents, newTC] }));
    return id;
  },

  updateThreadsContent: (threadsContentId, updates) => {
    set((state) => ({
      threadsContents: state.threadsContents.map((tc) =>
        tc.id === threadsContentId
          ? { ...tc, ...updates, updated_at: new Date().toISOString() }
          : tc
      ),
    }));
  },

  deleteThreadsContent: (threadsContentId) => {
    set((state) => ({
      threadsContents: state.threadsContents.filter((tc) => tc.id !== threadsContentId),
      threadsCards: state.threadsCards.filter((card) => card.threads_content_id !== threadsContentId),
    }));
  },

  getThreadsContents: (contentId) => {
    return get().threadsContents
      .filter((tc) => tc.content_id === contentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  getThreadsCards: (threadsContentId) => {
    return get().threadsCards
      .filter((card) => card.threads_content_id === threadsContentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  setThreadsCardsForContent: (threadsContentId, cards) => {
    set((state) => ({
      threadsCards: [
        ...state.threadsCards.filter((c) => c.threads_content_id !== threadsContentId),
        ...cards,
      ],
    }));
  },

  addThreadsCard: (threadsContentId, sortOrder) => {
    const now = new Date().toISOString();
    const newCard: ThreadsCard = {
      id: generateId('tp'),
      threads_content_id: threadsContentId,
      text_content: '',
      media_url: null,
      media_type: null,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ threadsCards: [...state.threadsCards, newCard] }));
  },

  updateThreadsCard: (cardId, updates) => {
    set((state) => ({
      threadsCards: state.threadsCards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updated_at: new Date().toISOString() }
          : card
      ),
    }));
  },

  deleteThreadsCard: (cardId) => {
    set((state) => ({
      threadsCards: state.threadsCards.filter((card) => card.id !== cardId),
    }));
  },

  reorderThreadsCards: (threadsContentId, cardIds) => {
    set((state) => ({
      threadsCards: state.threadsCards.map((card) => {
        if (card.threads_content_id !== threadsContentId) return card;
        const newOrder = cardIds.indexOf(card.id);
        return newOrder >= 0 ? { ...card, sort_order: newOrder } : card;
      }),
    }));
  },

  // YoutubeContent CRUD (1:N)
  addYoutubeContent: (contentId, data) => {
    const now = new Date().toISOString();
    const count = get().youtubeContents.filter((yc) => yc.content_id === contentId).length;
    const id = generateId('yt');
    const newYC: YoutubeContent = {
      id,
      content_id: contentId,
      title: data?.title ?? `유튜브 대본 ${count + 1}`,
      video_title: data?.video_title ?? null,
      video_description: data?.video_description ?? null,
      video_tags: data?.video_tags ?? null,
      video_category: data?.video_category ?? null,
      target_duration: data?.target_duration ?? 'mid',
      thumbnail_url: null,
      video_url: null,
      status: 'draft',
      youtube_video_id: null,
      published_at: null,
      created_at: now,
      updated_at: now,
      ...data,
    };
    set((state) => ({ youtubeContents: [...state.youtubeContents, newYC] }));
    return id;
  },

  updateYoutubeContent: (ytContentId, updates) => {
    set((state) => ({
      youtubeContents: state.youtubeContents.map((yc) =>
        yc.id === ytContentId
          ? { ...yc, ...updates, updated_at: new Date().toISOString() }
          : yc
      ),
    }));
  },

  deleteYoutubeContent: (ytContentId) => {
    set((state) => ({
      youtubeContents: state.youtubeContents.filter((yc) => yc.id !== ytContentId),
      youtubeCards: state.youtubeCards.filter((card) => card.youtube_content_id !== ytContentId),
    }));
  },

  getYoutubeContents: (contentId) => {
    return get().youtubeContents
      .filter((yc) => yc.content_id === contentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  getYoutubeCards: (youtubeContentId) => {
    return get().youtubeCards
      .filter((card) => card.youtube_content_id === youtubeContentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  setYoutubeCardsForContent: (youtubeContentId, cards) => {
    set((state) => ({
      youtubeCards: [
        ...state.youtubeCards.filter((c) => c.youtube_content_id !== youtubeContentId),
        ...cards,
      ],
    }));
  },

  addYoutubeCard: (youtubeContentId, sortOrder) => {
    const now = new Date().toISOString();
    const newCard: YoutubeCard = {
      id: generateId('yc'),
      youtube_content_id: youtubeContentId,
      section_type: 'main',
      narration_text: '',
      screen_direction: '',
      subtitle_text: null,
      image_url: null,
      image_prompt: null,
      video_prompt: null,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    };
    set((state) => ({ youtubeCards: [...state.youtubeCards, newCard] }));
  },

  updateYoutubeCard: (cardId, updates) => {
    set((state) => ({
      youtubeCards: state.youtubeCards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updated_at: new Date().toISOString() }
          : card
      ),
    }));
  },

  deleteYoutubeCard: (cardId) => {
    set((state) => ({
      youtubeCards: state.youtubeCards.filter((card) => card.id !== cardId),
    }));
  },

  reorderYoutubeCards: (youtubeContentId, cardIds) => {
    set((state) => ({
      youtubeCards: state.youtubeCards.map((card) => {
        if (card.youtube_content_id !== youtubeContentId) return card;
        const newOrder = cardIds.indexOf(card.id);
        return newOrder >= 0 ? { ...card, sort_order: newOrder } : card;
      }),
    }));
  },

  // ====== Strategy ======
  getStrategy: (projectId) => {
    return get().strategies.find((s) => s.projectId === projectId);
  },

  createOrUpdateStrategy: (projectId, input) => {
    const existing = get().strategies.find((s) => s.projectId === projectId);
    const now = new Date().toISOString();

    if (existing) {
      set((state) => ({
        strategies: state.strategies.map((s) =>
          s.projectId === projectId
            ? { ...s, input, updatedAt: now, overview: null, keywords: null, channelStrategy: null, contentStrategy: null, kpiAction: null, generationStatus: { overall: 'idle', tabs: { overview: { status: 'idle' }, keywords: { status: 'idle' }, channelStrategy: { status: 'idle' }, contentStrategy: { status: 'idle' }, kpiAction: { status: 'idle' } } } }
            : s
        ),
      }));
      return existing.id;
    }

    const id = generateId('strategy');
    const newStrategy: MarketingStrategy = {
      id,
      projectId,
      createdAt: now,
      updatedAt: now,
      input,
      overview: null,
      keywords: null,
      channelStrategy: null,
      contentStrategy: null,
      kpiAction: null,
      generationStatus: {
        overall: 'idle',
        tabs: {
          overview: { status: 'idle' },
          keywords: { status: 'idle' },
          channelStrategy: { status: 'idle' },
          contentStrategy: { status: 'idle' },
          kpiAction: { status: 'idle' },
        },
      },
    };
    set((state) => ({ strategies: [...state.strategies, newStrategy] }));
    return id;
  },

  updateStrategyTab: (strategyId, tab, data) => {
    set((state) => ({
      strategies: state.strategies.map((s) =>
        s.id === strategyId
          ? {
              ...s,
              [tab]: data,
              updatedAt: new Date().toISOString(),
              generationStatus: {
                ...s.generationStatus,
                tabs: { ...s.generationStatus.tabs, [tab]: { status: 'complete' } },
              },
            }
          : s
      ),
    }));
  },

  updateStrategyStatus: (strategyId, status) => {
    set((state) => ({
      strategies: state.strategies.map((s) =>
        s.id === strategyId
          ? {
              ...s,
              generationStatus: {
                ...s.generationStatus,
                ...status,
                tabs: { ...s.generationStatus.tabs, ...(status.tabs || {}) },
              },
            }
          : s
      ),
    }));
  },

  deleteStrategy: (projectId) => {
    set((state) => ({
      strategies: state.strategies.filter((s) => s.projectId !== projectId),
    }));
  },

  importStrategy: (projectId, data) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, imported_strategy: data, updated_at: new Date().toISOString() } : p
      ),
    }));
  },

  clearImportedStrategy: (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, imported_strategy: null, updated_at: new Date().toISOString() } : p
      ),
    }));
  },

  getImportedStrategy: (projectId) => {
    const project = get().projects.find(p => p.id === projectId);
    return (project?.imported_strategy as ImportedStrategy | null) ?? null;
  },

  // Channel model helpers
  getChannelModels: (projectId, channel) => {
    const project = get().projects.find((p) => p.id === projectId);
    const settings = (project?.ai_model_settings ?? {}) as Record<string, unknown>;
    const channels = (settings.channels ?? {}) as Record<string, Record<string, string>>;
    const channelSettings = channels[channel] ?? {};
    // Default aspect ratios per channel
    const defaultAspectRatios: Record<string, string> = {
      blog: '4:3',
      cardnews: '4:3',
      threads: '1:1',
      youtube: '16:9',
    };
    return {
      textModel: channelSettings.textModel ?? (settings.text_model as string) ?? DEFAULT_TEXT_MODEL,
      imageModel: channelSettings.imageModel ?? (settings.image_model as string) ?? DEFAULT_IMAGE_MODEL,
      aspectRatio: channelSettings.aspectRatio ?? defaultAspectRatios[channel] ?? '1:1',
      imageStyle: channelSettings.imageStyle ?? '',
    };
  },
  setChannelModels: (projectId, channel, models) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const settings = { ...((project.ai_model_settings ?? {}) as Record<string, unknown>) };
    const channels = { ...((settings.channels ?? {}) as Record<string, Record<string, string>>) };
    channels[channel] = { ...channels[channel], ...models };
    settings.channels = channels;
    get().updateProject(projectId, { ai_model_settings: settings });
  },

  // UI state
  openProjectSettings: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: true, showStrategy: false, showAnalytics: false });
  },
  setShowProjectSettings: (show) => set({ showProjectSettings: show, showStrategy: false, showAnalytics: false }),
  openStrategy: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: true, showAnalytics: false });
  },
  setShowStrategy: (show) => set({ showStrategy: show, showProjectSettings: false, showAnalytics: false }),
  openAnalytics: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: false, showAnalytics: true });
  },
  setShowAnalytics: (show) => set({ showAnalytics: show, showProjectSettings: false, showStrategy: false }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
}), {
  name: 'contentflow-store',
  storage: idbStorage,
  partialize: (state) => ({
    projects: state.projects,
    contents: state.contents,
    baseArticles: state.baseArticles,
    blogContents: state.blogContents,
    blogCards: state.blogCards,
    instagramContents: state.instagramContents,
    instagramCards: state.instagramCards,
    threadsContents: state.threadsContents,
    threadsCards: state.threadsCards,
    youtubeContents: state.youtubeContents,
    youtubeCards: state.youtubeCards,
    strategies: state.strategies,
    selectedProjectId: state.selectedProjectId,
    selectedContentId: state.selectedContentId,
  }),
  onRehydrateStorage: () => {
    // IndexedDB 복원 완료 후 R2에서 최신 데이터 로드
    return (_state, error) => {
      if (error) return;
      loadFromCloud();
    };
  },
}));

// ─── R2 클라우드 동기화 ───

const SYNC_FIELDS = [
  'projects', 'contents', 'baseArticles',
  'blogContents', 'blogCards',
  'instagramContents', 'instagramCards',
  'threadsContents', 'threadsCards',
  'youtubeContents', 'youtubeCards',
  'strategies', 'selectedProjectId', 'selectedContentId',
] as const;

function getPartialState() {
  const state = useProjectStore.getState();
  const partial: Record<string, unknown> = {};
  for (const key of SYNC_FIELDS) partial[key] = state[key];
  return partial;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function saveToCloud() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch('/api/storage/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: getPartialState() }),
      });
    } catch {
      // 오프라인이면 무시 — IndexedDB에는 이미 저장됨
    }
  }, 3000); // 3초 디바운스
}

async function loadFromCloud() {
  try {
    const res = await fetch('/api/storage/sync');
    if (!res.ok) return;
    const { data } = await res.json();
    if (!data) return;

    // R2 데이터가 로컬보다 프로젝트가 더 많으면 R2 데이터 사용
    const local = useProjectStore.getState();
    if (data.projects?.length > 0 && data.projects.length >= (local.projects?.length ?? 0)) {
      useProjectStore.setState(data);
    }
  } catch {
    // 실패 시 무시 — 로컬 데이터 유지
  }
}

// 스토어 변경 구독 → 자동 클라우드 저장
useProjectStore.subscribe(saveToCloud);
