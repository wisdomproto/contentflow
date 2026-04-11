CREATE TABLE monitoring_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, keyword, language)
);

CREATE TABLE monitoring_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES monitoring_keywords(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'naver_jisikin', 'naver_blog', 'wordpress')),
  url TEXT,
  title TEXT,
  snippet TEXT,
  author TEXT,
  engagement JSONB DEFAULT '{}',
  discovered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID REFERENCES monitoring_feed(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  generated_comment TEXT,
  tone TEXT DEFAULT 'professional',
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'copied', 'posted')),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
