CREATE TABLE publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wordpress', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube')),
  language TEXT NOT NULL DEFAULT 'ko',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  published_url TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publish_records_project ON publish_records(project_id);
CREATE INDEX idx_publish_records_status ON publish_records(status);
CREATE INDEX idx_publish_records_scheduled ON publish_records(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE publish_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view publish records"
  ON publish_records FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Editors+ can manage publish records"
  ON publish_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members WHERE project_id = publish_records.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')
  ));
