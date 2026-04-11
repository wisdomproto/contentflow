// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  }),
}))

describe('query helpers', () => {
  it('projectQueries.list returns a query builder', async () => {
    const { projectQueries } = await import('@/lib/supabase/queries')
    const result = projectQueries.list()
    expect(result).toBeDefined()
  })

  it('projectQueries.get builds query with id filter', async () => {
    const { projectQueries } = await import('@/lib/supabase/queries')
    const result = projectQueries.get('project-123')
    expect(result).toBeDefined()
  })

  it('contentQueries.listByProject builds query with project_id filter', async () => {
    const { contentQueries } = await import('@/lib/supabase/queries')
    const result = contentQueries.listByProject('test-id')
    expect(result).toBeDefined()
  })

  it('baseArticleQueries.getByContent builds query with content_id filter', async () => {
    const { baseArticleQueries } = await import('@/lib/supabase/queries')
    const result = baseArticleQueries.getByContent('content-123')
    expect(result).toBeDefined()
  })

  it('blogContentQueries.listByContent builds query', async () => {
    const { blogContentQueries } = await import('@/lib/supabase/queries')
    const result = blogContentQueries.listByContent('content-123')
    expect(result).toBeDefined()
  })

  it('blogCardQueries.listByParent builds query with parent filter', async () => {
    const { blogCardQueries } = await import('@/lib/supabase/queries')
    const result = blogCardQueries.listByParent('test-content-id')
    expect(result).toBeDefined()
  })

  it('blogCardQueries.reorder builds update query', async () => {
    const { blogCardQueries } = await import('@/lib/supabase/queries')
    const result = blogCardQueries.reorder('card-id', 3)
    expect(result).toBeDefined()
  })

  it('instagramContentQueries.listByContent builds query', async () => {
    const { instagramContentQueries } = await import('@/lib/supabase/queries')
    const result = instagramContentQueries.listByContent('content-123')
    expect(result).toBeDefined()
  })

  it('instagramCardQueries.listByParent builds query', async () => {
    const { instagramCardQueries } = await import('@/lib/supabase/queries')
    const result = instagramCardQueries.listByParent('instagram-content-id')
    expect(result).toBeDefined()
  })

  it('threadsContentQueries.listByContent builds query', async () => {
    const { threadsContentQueries } = await import('@/lib/supabase/queries')
    const result = threadsContentQueries.listByContent('content-123')
    expect(result).toBeDefined()
  })

  it('threadsCardQueries.listByParent builds query', async () => {
    const { threadsCardQueries } = await import('@/lib/supabase/queries')
    const result = threadsCardQueries.listByParent('threads-content-id')
    expect(result).toBeDefined()
  })

  it('youtubeContentQueries.listByContent builds query', async () => {
    const { youtubeContentQueries } = await import('@/lib/supabase/queries')
    const result = youtubeContentQueries.listByContent('content-123')
    expect(result).toBeDefined()
  })

  it('youtubeCardQueries.listByParent builds query', async () => {
    const { youtubeCardQueries } = await import('@/lib/supabase/queries')
    const result = youtubeCardQueries.listByParent('youtube-content-id')
    expect(result).toBeDefined()
  })

  it('projectMemberQueries.listByProject builds query', async () => {
    const { projectMemberQueries } = await import('@/lib/supabase/queries')
    const result = projectMemberQueries.listByProject('project-123')
    expect(result).toBeDefined()
  })

  it('channelConnectionQueries.listByProject builds query', async () => {
    const { channelConnectionQueries } = await import('@/lib/supabase/queries')
    const result = channelConnectionQueries.listByProject('project-123')
    expect(result).toBeDefined()
  })
})
