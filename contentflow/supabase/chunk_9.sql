CREATE INDEX idx_monitoring_feed_project ON monitoring_feed(project_id);

CREATE INDEX idx_comment_logs_project ON comment_logs(project_id);

ALTER TABLE monitoring_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view monitoring keywords" ON monitoring_keywords FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage monitoring keywords" ON monitoring_keywords FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = monitoring_keywords.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "Members can view monitoring feed" ON monitoring_feed FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage monitoring feed" ON monitoring_feed FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = monitoring_feed.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "Members can view comment logs" ON comment_logs FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage comment logs" ON comment_logs FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = comment_logs.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE TABLE competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  country TEXT DEFAULT 'kr',
  keywords JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitor_profiles ENABLE ROW LEVEL SECURITY;

