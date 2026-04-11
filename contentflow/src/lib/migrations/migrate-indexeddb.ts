import { get } from 'idb-keyval'
import { createClient } from '@/lib/supabase/client'

export async function migrateFromIndexedDB(): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  try {
    const oldState = await get('project-storage')
    if (!oldState) return { success: true, message: 'No data to migrate' }

    const parsed = JSON.parse(oldState as string)
    const state = parsed?.state

    if (!state?.projects?.length) return { success: true, message: 'No projects found' }

    for (const project of state.projects) {
      await supabase.from('projects').upsert(project)
    }
    for (const item of state.contents || []) {
      await supabase.from('contents').upsert(item)
    }
    for (const item of state.baseArticles || []) {
      await supabase.from('base_articles').upsert(item)
    }
    for (const item of state.blogContents || []) {
      await supabase.from('blog_contents').upsert(item)
    }
    for (const item of state.blogCards || []) {
      await supabase.from('blog_cards').upsert(item)
    }
    for (const item of state.instagramContents || []) {
      await supabase.from('instagram_contents').upsert(item)
    }
    for (const item of state.instagramCards || []) {
      await supabase.from('instagram_cards').upsert(item)
    }
    for (const item of state.threadsContents || []) {
      await supabase.from('threads_contents').upsert(item)
    }
    for (const item of state.threadsCards || []) {
      await supabase.from('threads_cards').upsert(item)
    }
    for (const item of state.youtubeContents || []) {
      await supabase.from('youtube_contents').upsert(item)
    }
    for (const item of state.youtubeCards || []) {
      await supabase.from('youtube_cards').upsert(item)
    }
    for (const item of state.strategies || []) {
      await supabase.from('marketing_strategies').upsert(item)
    }

    return { success: true, message: `Migrated ${state.projects.length} projects` }
  } catch (err) {
    return { success: false, message: String(err) }
  }
}
