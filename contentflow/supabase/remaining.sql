CREATE TABLE writing_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('global','blog','instagram','threads','youtube')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_text TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  memo TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','published')),
  ai_model_settings JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reference_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf','docx','md','txt','hwp','youtube','url')),
  source_url TEXT,
  file_url TEXT,
  file_name TEXT,
  extracted_text TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  body_plain_text TEXT,
  word_count INTEGER DEFAULT 0,
  factcheck_status TEXT CHECK (factcheck_status IN ('unchecked','checking','checked')),
  factcheck_score INTEGER,
  factcheck_report JSONB,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_score INTEGER,
  seo_details JSONB,
  naver_keywords JSONB,
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_content_id UUID REFERENCES blog_contents(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('text','image','divider','quote','list')),
  content JSONB NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE instagram_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT[],
  content_type TEXT DEFAULT 'carousel' CHECK (content_type IN ('carousel','video','single')),
  video_settings JSONB,
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE instagram_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_content_id UUID REFERENCES instagram_contents(id) ON DELETE CASCADE,
  text_content TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_style JSONB,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE threads_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  thread_type TEXT DEFAULT 'single' CHECK (thread_type IN ('single','multi')),
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE threads_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threads_content_id UUID REFERENCES threads_contents(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE youtube_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  video_title TEXT,
  video_description TEXT,
  video_tags TEXT[],
  video_category TEXT,
  target_duration TEXT CHECK (target_duration IN ('short','mid','long')),
  thumbnail_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'draft',
  youtube_video_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE youtube_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_content_id UUID REFERENCES youtube_contents(id) ON DELETE CASCADE,
  section_type TEXT,
  narration_text TEXT,
  screen_direction TEXT,
  subtitle_text TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image','audio','video')),
  file_url TEXT NOT NULL,
  prompt TEXT,
  generation_params JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factcheck_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  claims JSONB NOT NULL,
  trust_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','uploading','success','failed')),
  platform_post_id TEXT,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX idx_translations_content ON translations(content_id);
CREATE INDEX idx_translations_status ON translations(status);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view translations"
  ON translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Editors+ can manage translations"
  ON translations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'editor')
  ));
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
