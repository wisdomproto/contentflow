CREATE TABLE seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  google_score INT,
  naver_score INT,
  geo_score INT,
  tech_score INT,
  issues JSONB DEFAULT '[]',
  meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_engine TEXT NOT NULL CHECK (search_engine IN ('google', 'naver')),
  country TEXT DEFAULT 'kr',
  position INT,
  url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, keyword, search_engine, country, date)
);

CREATE INDEX idx_seo_audits_project ON seo_audits(project_id);
CREATE INDEX idx_keyword_rankings_project ON keyword_rankings(project_id);
CREATE INDEX idx_keyword_rankings_date ON keyword_rankings(date);

ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view seo audits" ON seo_audits FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage seo audits" ON seo_audits FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = seo_audits.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "Members can view keyword rankings" ON keyword_rankings FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage keyword rankings" ON keyword_rankings FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = keyword_rankings.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
