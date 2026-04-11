ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE writing_guides ENABLE ROW LEVEL SECURITY;

ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;

ALTER TABLE base_articles ENABLE ROW LEVEL SECURITY;

ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE blog_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE instagram_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE instagram_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE threads_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE threads_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE youtube_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE youtube_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

ALTER TABLE factcheck_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own api_keys" ON api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own writing_guides" ON writing_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contents" ON contents FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_base_articles_updated_at BEFORE UPDATE ON base_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_contents_updated_at BEFORE UPDATE ON blog_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_cards_updated_at BEFORE UPDATE ON blog_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_contents_updated_at BEFORE UPDATE ON instagram_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_cards_updated_at BEFORE UPDATE ON instagram_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_threads_contents_updated_at BEFORE UPDATE ON threads_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_youtube_contents_updated_at BEFORE UPDATE ON youtube_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_youtube_cards_updated_at BEFORE UPDATE ON youtube_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE base_articles ENABLE ROW LEVEL SECURITY;

ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE blog_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE instagram_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE instagram_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE threads_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE threads_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE youtube_contents ENABLE ROW LEVEL SECURITY;

ALTER TABLE youtube_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  );

$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (is_project_member(id));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can view contents"
  ON contents FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Editors+ can manage contents"
  ON contents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = contents.project_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'editor')
  ));

CREATE POLICY "Members can view team"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can manage team"
  ON project_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'admin'
  ));

CREATE OR REPLACE FUNCTION add_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin');

RETURN NEW;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator();

ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_languages TEXT[] DEFAULT ARRAY['ko'];

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

CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'translating', 'review', 'completed')),
  title TEXT,
  body TEXT,
  cards_json JSONB,
  seo_title TEXT,
  seo_description TEXT,
  translated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, language, channel_type)
);

