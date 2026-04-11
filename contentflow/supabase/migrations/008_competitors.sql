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
CREATE POLICY "Members can view competitors" ON competitor_profiles FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage competitors" ON competitor_profiles FOR ALL USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = competitor_profiles.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')));
