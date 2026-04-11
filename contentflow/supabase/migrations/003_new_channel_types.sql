-- Add target_languages to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_languages TEXT[] DEFAULT ARRAY['ko'];

-- Channel connections table
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube')),
  language TEXT NOT NULL DEFAULT 'ko',
  account_id TEXT,
  account_name TEXT,
  vault_secret_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, platform, language)
);

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channels"
  ON channel_connections FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can manage channels"
  ON channel_connections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = channel_connections.project_id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));
