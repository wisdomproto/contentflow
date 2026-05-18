// @vitest-environment node
import { describe, it, expectTypeOf } from 'vitest'
import type { ChannelType, ProjectMember, ChannelConnection } from '@/types/database'

describe('database types', () => {
  it('ChannelType includes self_hosted and naver_blog', () => {
    expectTypeOf<'self_hosted'>().toMatchTypeOf<ChannelType>()
    expectTypeOf<'naver_blog'>().toMatchTypeOf<ChannelType>()
  })

  it('ProjectMember has required fields', () => {
    expectTypeOf<ProjectMember>().toHaveProperty('project_id')
    expectTypeOf<ProjectMember>().toHaveProperty('user_id')
    expectTypeOf<ProjectMember>().toHaveProperty('role')
  })

  it('ChannelConnection has required fields', () => {
    expectTypeOf<ChannelConnection>().toHaveProperty('platform')
    expectTypeOf<ChannelConnection>().toHaveProperty('language')
    expectTypeOf<ChannelConnection>().toHaveProperty('account_name')
  })
})
