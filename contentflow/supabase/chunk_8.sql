CREATE INDEX idx_seo_audits_project ON seo_audits(project_id);

CREATE INDEX idx_keyword_rankings_project ON keyword_rankings(project_id);
CREATE INDEX idx_keyword_rankings_date ON keyword_rankings(date);

ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view seo audits" ON seo_audits FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage seo audits" ON seo_audits FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = seo_audits.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "Members can view keyword rankings" ON keyword_rankings FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage keyword rankings" ON keyword_rankings FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = keyword_rankings.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
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

