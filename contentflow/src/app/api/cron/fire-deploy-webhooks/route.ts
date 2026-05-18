import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const admin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_RETRY = 3;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // PostgREST can't compare two columns in .or() — fetch all, filter client-side
  const { data: all, error } = await admin
    .from('deploy_webhook_queue')
    .select('project_id, enqueued_at, last_fired_at, retry_count, last_error');
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const pending = (all || []).filter((r: any) =>
    r.last_fired_at === null || new Date(r.enqueued_at).getTime() > new Date(r.last_fired_at).getTime()
  );
  if (!pending.length) {
    return Response.json({ fired: 0, skipped: 0 });
  }

  const results: { project_id: string; ok: boolean; error?: string }[] = [];
  for (const row of pending) {
    if (row.retry_count >= MAX_RETRY) {
      results.push({ project_id: row.project_id, ok: false, error: `retry-exhausted: ${row.last_error || 'unknown'}` });
      continue;
    }
    // Snapshot the enqueued_at — if a fresh enqueue happens during the fire, next cycle will pick it up
    const snapshotFiredAt = row.enqueued_at;

    const { data: project } = await admin
      .from('projects').select('published_site').eq('id', row.project_id).maybeSingle();
    const url = (project?.published_site as any)?.deploy_webhook_url;
    if (!url) {
      await admin.from('deploy_webhook_queue').update({
        last_fired_at: snapshotFiredAt,
        last_error: 'deploy_webhook_url not configured',
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: false, error: 'no webhook url' });
      continue;
    }

    try {
      const r = await fetch(url, { method: 'POST', body: JSON.stringify({}) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await admin.from('deploy_webhook_queue').update({
        last_fired_at: snapshotFiredAt,
        retry_count: 0,
        last_error: null,
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: true });
    } catch (err) {
      const msg = (err as Error).message;
      await admin.from('deploy_webhook_queue').update({
        retry_count: row.retry_count + 1,
        last_error: msg,
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: false, error: msg });
    }
  }

  const fired = results.filter((r) => r.ok).length;
  const skipped = results.length - fired;
  return Response.json({ fired, skipped, results });
}
