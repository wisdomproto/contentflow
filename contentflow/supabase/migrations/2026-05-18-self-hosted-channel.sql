-- Self-Hosted Blog Publishing (Phase A)
-- See: docs/superpowers/specs/2026-05-18-self-hosted-blog-publishing-design.md

-- (a) projects.published_site JSONB 슬롯
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_site JSONB DEFAULT NULL;

-- (b) publish_records.channel enum 교체 (wordpress 제거, self_hosted 추가)
ALTER TABLE publish_records DROP CONSTRAINT IF EXISTS publish_records_channel_check;
ALTER TABLE publish_records ADD CONSTRAINT publish_records_channel_check
  CHECK (channel IN ('self_hosted', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube'));

-- 기존 wordpress 행이 있다면 self_hosted로 이전 (187 프로젝트엔 거의 없을 가능성)
UPDATE publish_records SET channel='self_hosted' WHERE channel='wordpress';

-- (c) 중복 예약 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_publish_self_hosted
  ON publish_records (content_id, language, channel)
  WHERE channel='self_hosted' AND status IN ('scheduled', 'published');

-- (d) deploy_webhook_queue 테이블 (debounce 용) — 먼저 생성
CREATE TABLE IF NOT EXISTS deploy_webhook_queue (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enqueued_at TIMESTAMPTZ NOT NULL,
  last_fired_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);
ALTER TABLE deploy_webhook_queue DISABLE ROW LEVEL SECURITY;

-- (e) pg_cron 잡 — 자동 발행 + 큐 enqueue
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 동일 잡 이미 존재 시 삭제 후 재등록 (idempotent)
SELECT cron.unschedule('publish-self-hosted')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='publish-self-hosted');

SELECT cron.schedule('publish-self-hosted', '* * * * *', $$
  WITH transitioned AS (
    UPDATE publish_records
    SET status='published', published_at=NOW(), updated_at=NOW()
    WHERE status='scheduled'
      AND channel='self_hosted'
      AND scheduled_at <= NOW()
    RETURNING project_id
  )
  INSERT INTO deploy_webhook_queue (project_id, enqueued_at)
  SELECT DISTINCT project_id, NOW() FROM transitioned
  ON CONFLICT (project_id) DO UPDATE SET enqueued_at = EXCLUDED.enqueued_at;
$$);
