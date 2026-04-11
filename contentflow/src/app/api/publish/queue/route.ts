import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')

  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const supabase = await createClient()
  let query = supabase.from('publish_records').select('*').eq('project_id', projectId)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
