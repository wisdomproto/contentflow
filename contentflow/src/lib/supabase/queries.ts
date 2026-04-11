import { createClient } from './client'
import type {
  Project,
  Content,
  BaseArticle,
  BlogContent,
  BlogCard,
  InstagramContent,
  InstagramCard,
  ThreadsContent,
  ThreadsCard,
  YoutubeContent,
  YoutubeCard,
  ProjectMember,
  ChannelConnection,
} from '@/types/database'

function getClient() {
  return createClient()
}

// --- Projects ---

export const projectQueries = {
  list: () =>
    getClient().from('projects').select('*').order('sort_order'),
  get: (id: string) =>
    getClient().from('projects').select('*').eq('id', id).single(),
  create: (data: Partial<Project>) =>
    getClient().from('projects').insert(data).select().single(),
  update: (id: string, data: Partial<Project>) =>
    getClient().from('projects').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('projects').delete().eq('id', id),
}

// --- Contents ---

export const contentQueries = {
  listByProject: (projectId: string) =>
    getClient().from('contents').select('*').eq('project_id', projectId).order('sort_order'),
  get: (id: string) =>
    getClient().from('contents').select('*').eq('id', id).single(),
  create: (data: Partial<Content>) =>
    getClient().from('contents').insert(data).select().single(),
  update: (id: string, data: Partial<Content>) =>
    getClient().from('contents').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('contents').delete().eq('id', id),
}

// --- BaseArticles ---

export const baseArticleQueries = {
  getByContent: (contentId: string) =>
    getClient().from('base_articles').select('*').eq('content_id', contentId).single(),
  create: (data: Partial<BaseArticle>) =>
    getClient().from('base_articles').insert(data).select().single(),
  update: (id: string, data: Partial<BaseArticle>) =>
    getClient().from('base_articles').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('base_articles').delete().eq('id', id),
}

// --- BlogContents ---

export const blogContentQueries = {
  listByContent: (contentId: string) =>
    getClient().from('blog_contents').select('*').eq('content_id', contentId).order('created_at'),
  get: (id: string) =>
    getClient().from('blog_contents').select('*').eq('id', id).single(),
  create: (data: Partial<BlogContent>) =>
    getClient().from('blog_contents').insert(data).select().single(),
  update: (id: string, data: Partial<BlogContent>) =>
    getClient().from('blog_contents').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('blog_contents').delete().eq('id', id),
}

// --- BlogCards ---

export const blogCardQueries = {
  listByParent: (blogContentId: string) =>
    getClient().from('blog_cards').select('*').eq('blog_content_id', blogContentId).order('sort_order'),
  create: (data: Partial<BlogCard>) =>
    getClient().from('blog_cards').insert(data).select().single(),
  update: (id: string, data: Partial<BlogCard>) =>
    getClient().from('blog_cards').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('blog_cards').delete().eq('id', id),
  reorder: (id: string, sortOrder: number) =>
    getClient().from('blog_cards').update({ sort_order: sortOrder }).eq('id', id),
}

// --- InstagramContents ---

export const instagramContentQueries = {
  listByContent: (contentId: string) =>
    getClient().from('instagram_contents').select('*').eq('content_id', contentId).order('created_at'),
  get: (id: string) =>
    getClient().from('instagram_contents').select('*').eq('id', id).single(),
  create: (data: Partial<InstagramContent>) =>
    getClient().from('instagram_contents').insert(data).select().single(),
  update: (id: string, data: Partial<InstagramContent>) =>
    getClient().from('instagram_contents').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('instagram_contents').delete().eq('id', id),
}

// --- InstagramCards ---

export const instagramCardQueries = {
  listByParent: (instagramContentId: string) =>
    getClient().from('instagram_cards').select('*').eq('instagram_content_id', instagramContentId).order('sort_order'),
  create: (data: Partial<InstagramCard>) =>
    getClient().from('instagram_cards').insert(data).select().single(),
  update: (id: string, data: Partial<InstagramCard>) =>
    getClient().from('instagram_cards').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('instagram_cards').delete().eq('id', id),
  reorder: (id: string, sortOrder: number) =>
    getClient().from('instagram_cards').update({ sort_order: sortOrder }).eq('id', id),
}

// --- ThreadsContents ---

export const threadsContentQueries = {
  listByContent: (contentId: string) =>
    getClient().from('threads_contents').select('*').eq('content_id', contentId).order('created_at'),
  get: (id: string) =>
    getClient().from('threads_contents').select('*').eq('id', id).single(),
  create: (data: Partial<ThreadsContent>) =>
    getClient().from('threads_contents').insert(data).select().single(),
  update: (id: string, data: Partial<ThreadsContent>) =>
    getClient().from('threads_contents').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('threads_contents').delete().eq('id', id),
}

// --- ThreadsCards ---

export const threadsCardQueries = {
  listByParent: (threadsContentId: string) =>
    getClient().from('threads_cards').select('*').eq('threads_content_id', threadsContentId).order('sort_order'),
  create: (data: Partial<ThreadsCard>) =>
    getClient().from('threads_cards').insert(data).select().single(),
  update: (id: string, data: Partial<ThreadsCard>) =>
    getClient().from('threads_cards').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('threads_cards').delete().eq('id', id),
  reorder: (id: string, sortOrder: number) =>
    getClient().from('threads_cards').update({ sort_order: sortOrder }).eq('id', id),
}

// --- YoutubeContents ---

export const youtubeContentQueries = {
  listByContent: (contentId: string) =>
    getClient().from('youtube_contents').select('*').eq('content_id', contentId).order('created_at'),
  get: (id: string) =>
    getClient().from('youtube_contents').select('*').eq('id', id).single(),
  create: (data: Partial<YoutubeContent>) =>
    getClient().from('youtube_contents').insert(data).select().single(),
  update: (id: string, data: Partial<YoutubeContent>) =>
    getClient().from('youtube_contents').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('youtube_contents').delete().eq('id', id),
}

// --- YoutubeCards ---

export const youtubeCardQueries = {
  listByParent: (youtubeContentId: string) =>
    getClient().from('youtube_cards').select('*').eq('youtube_content_id', youtubeContentId).order('sort_order'),
  create: (data: Partial<YoutubeCard>) =>
    getClient().from('youtube_cards').insert(data).select().single(),
  update: (id: string, data: Partial<YoutubeCard>) =>
    getClient().from('youtube_cards').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('youtube_cards').delete().eq('id', id),
  reorder: (id: string, sortOrder: number) =>
    getClient().from('youtube_cards').update({ sort_order: sortOrder }).eq('id', id),
}

// --- ProjectMembers (V2) ---

export const projectMemberQueries = {
  listByProject: (projectId: string) =>
    getClient().from('project_members').select('*').eq('project_id', projectId),
  create: (data: Partial<ProjectMember>) =>
    getClient().from('project_members').insert(data).select().single(),
  update: (id: string, data: Partial<ProjectMember>) =>
    getClient().from('project_members').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('project_members').delete().eq('id', id),
}

// --- ChannelConnections (V2) ---

export const channelConnectionQueries = {
  listByProject: (projectId: string) =>
    getClient().from('channel_connections').select('*').eq('project_id', projectId),
  create: (data: Partial<ChannelConnection>) =>
    getClient().from('channel_connections').insert(data).select().single(),
  update: (id: string, data: Partial<ChannelConnection>) =>
    getClient().from('channel_connections').update(data).eq('id', id),
  delete: (id: string) =>
    getClient().from('channel_connections').delete().eq('id', id),
}
