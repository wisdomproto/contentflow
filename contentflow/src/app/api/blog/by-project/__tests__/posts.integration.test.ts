import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const PROJECT_ID = '6cc3c9c6-1718-4097-b7a0-0f95ae74d913' // 187 project

describe('GET /api/blog/by-project/[id]/posts', () => {
  it('returns valid envelope for ko', async () => {
    const res = await fetch(`${BASE}/api/blog/by-project/${PROJECT_ID}/posts?lang=ko`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('posts')
    expect(Array.isArray(json.posts)).toBe(true)
  })

  it('returns valid envelope for th', async () => {
    const res = await fetch(`${BASE}/api/blog/by-project/${PROJECT_ID}/posts?lang=th`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.posts)).toBe(true)
  })

  it('returns empty list for unknown project', async () => {
    const res = await fetch(`${BASE}/api/blog/by-project/00000000-0000-0000-0000-000000000000/posts?lang=ko`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.posts).toEqual([])
  })

  it.todo('skips non-ko records without translation — seed fixture, then verify TH response contains only posts with translation.body')
})
