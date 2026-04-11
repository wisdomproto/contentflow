-- ContentFlow Initial Schema — PRD v2.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 (Project)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  industry TEXT,
  brand_name TEXT,
  brand_description TEXT,
  target_audience JSONB,
  usp TEXT,
  brand_tone TEXT,
  banned_keywords TEXT[],
  brand_logo_url TEXT,
  marketer_name TEXT,
  marketer_expertise TEXT,
  marketer_style TEXT,
  marketer_phrases TEXT[],
  sns_goal TEXT,
  blog_tone_prompt TEXT,
  blog_image_style_prompt TEXT,
  instagram_tone_prompt TEXT,
  instagram_image_style_prompt TEXT,
  threads_tone_prompt TEXT,
  youtube_tone_prompt TEXT,
  youtube_image_style_prompt TEXT,
  ai_model_settings JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 키
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gemini','instagram','threads','youtube','naver','perplexity','meta_pixel','ga4')),
  encrypted_key TEXT NOT NULL,
  metadata JSONB,
  is_connected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 글쓰기 가이드
CREATE TABLE writing_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('global','blog','instagram','threads','youtube')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_text TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 컨텐츠 (Content)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- 참고 자료
CREATE TABLE reference_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf','docx','md','txt','hwp','youtube','url')),
  source_url TEXT,
  file_url TEXT,
  file_name TEXT,
  extracted_text TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 글
CREATE TABLE base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 블로그 컨텐츠
CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 블로그 카드
CREATE TABLE blog_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_content_id UUID REFERENCES blog_contents(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('text','image','divider','quote','list')),
  content JSONB NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인스타그램 컨텐츠
CREATE TABLE instagram_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 인스타그램 카드
CREATE TABLE instagram_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instagram_content_id UUID REFERENCES instagram_contents(id) ON DELETE CASCADE,
  text_content TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_style JSONB,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스레드 컨텐츠
CREATE TABLE threads_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  thread_type TEXT DEFAULT 'single' CHECK (thread_type IN ('single','multi')),
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스레드 카드
CREATE TABLE threads_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  threads_content_id UUID REFERENCES threads_contents(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유튜브 컨텐츠
CREATE TABLE youtube_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 유튜브 카드
CREATE TABLE youtube_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_content_id UUID REFERENCES youtube_contents(id) ON DELETE CASCADE,
  section_type TEXT,
  narration_text TEXT,
  screen_direction TEXT,
  subtitle_text TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 미디어 에셋
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- 팩트체크 리포트
CREATE TABLE factcheck_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  claims JSONB NOT NULL,
  trust_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시 이력
CREATE TABLE publish_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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

-- RLS Policies (사용자별 접근 제어)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own api_keys" ON api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own writing_guides" ON writing_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contents" ON contents FOR ALL USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
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
