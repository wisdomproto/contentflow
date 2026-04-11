import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!projectId || !start || !end) {
    return Response.json({ error: 'projectId, start, end required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('publish_records')
    .select('*')
    .eq('project_id', projectId)
    .or(`scheduled_at.gte.${start},published_at.gte.${start}`)
    .or(`scheduled_at.lte.${end},published_at.lte.${end}`)
    .order('scheduled_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
